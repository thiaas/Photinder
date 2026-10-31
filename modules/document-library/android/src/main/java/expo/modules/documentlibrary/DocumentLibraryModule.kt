package expo.modules.documentlibrary

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.webkit.MimeTypeMap
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DocumentLibraryModule : Module() {
  private var pickerPromise: Promise? = null
  private val requestCode = 46217
  private val mediaExtensions = setOf("jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif", "bmp", "tif", "tiff", "svg", "raw", "dng", "cr2", "nef", "arw", "mp4", "mov", "m4v", "mkv", "avi", "webm", "3gp", "mpeg", "mpg", "wmv", "flv", "mp3", "m4a", "aac", "wav", "ogg", "flac", "opus", "aiff", "wma", "amr")

  override fun definition() = ModuleDefinition {
    Name("DocumentLibrary")

    AsyncFunction("pickFolder") { promise: Promise ->
      if (pickerPromise != null) {
        promise.reject("PICKER_BUSY", "Il selettore e' gia' aperto.", null)
      } else {
        val activity = appContext.currentActivity
        if (activity == null) {
          promise.reject("NO_ACTIVITY", "Schermata Android non disponibile.", null)
        } else {
          pickerPromise = promise
          try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
              addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
            }
            activity.startActivityForResult(intent, requestCode)
          } catch (error: Exception) {
            pickerPromise = null
            promise.reject("PICKER_FAILED", error.message, error)
          }
        }
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, result ->
      if (result.requestCode == requestCode) {
        val promise = pickerPromise
        pickerPromise = null
        val data = result.data
        val uri = data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
          promise?.resolve(null)
        } else {
          try {
            val resolver = context().contentResolver
            val flags = (data?.flags ?: 0) and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            if (flags and Intent.FLAG_GRANT_READ_URI_PERMISSION == 0) throw IllegalStateException("Accesso in lettura non concesso.")
            resolver.takePersistableUriPermission(uri, flags)
            val root = DocumentsContract.buildDocumentUriUsingTree(uri, DocumentsContract.getTreeDocumentId(uri))
            var name = "Documenti"
            resolver.query(root, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { cursor ->
              if (cursor.moveToFirst()) name = cursor.getString(0) ?: name
            }
            promise?.resolve(mapOf("token" to uri.toString(), "name" to name))
          } catch (error: Exception) {
            promise?.reject("FOLDER_ACCESS", error.message, error)
          }
        }
      }
    }

    AsyncFunction("listDocuments") { token: String ->
      val resolver = context().contentResolver
      val tree = checkedTree(token)
      val pending = ArrayDeque<String>()
      val visited = mutableSetOf<String>()
      val items = mutableListOf<Map<String, Any?>>()
      pending.add(DocumentsContract.getTreeDocumentId(tree))
      val columns = arrayOf(
        DocumentsContract.Document.COLUMN_DOCUMENT_ID,
        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
        DocumentsContract.Document.COLUMN_MIME_TYPE,
        DocumentsContract.Document.COLUMN_LAST_MODIFIED,
        DocumentsContract.Document.COLUMN_SIZE
      )
      while (pending.isNotEmpty()) {
        val parent = pending.removeFirst()
        if (!visited.add(parent)) continue
        val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parent)
        val cursor = resolver.query(children, columns, null, null, null)
          ?: throw IllegalStateException("Impossibile leggere la cartella. Autorizzala nuovamente.")
        cursor.use {
          while (it.moveToNext()) {
            val id = it.getString(0)
            val name = it.getString(1) ?: "Documento"
            val mime = it.getString(2) ?: "application/octet-stream"
            if (mime == DocumentsContract.Document.MIME_TYPE_DIR) {
              pending.add(id)
            } else if (!isMedia(name, mime)) {
              val uri = DocumentsContract.buildDocumentUriUsingTree(tree, id)
              items.add(mapOf(
                "id" to "${tree.authority}:$id", "uri" to uri.toString(), "filename" to name,
                "mediaType" to "document", "creationTime" to if (it.isNull(3)) 0.0 else it.getLong(3).toDouble(),
                "mimeType" to mime, "size" to if (it.isNull(4)) null else it.getLong(4).toDouble()
              ))
            }
          }
        }
      }
      items
    }

    AsyncFunction("openDocument") { uriValue: String, token: String ->
      val uri = checkedDocument(uriValue, token)
      val resolver = context().contentResolver
      val mime = resolver.getType(uri) ?: "application/octet-stream"
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mime)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        clipData = ClipData.newRawUri("Documento", uri)
      }
      val activity = appContext.currentActivity ?: throw IllegalStateException("Schermata non disponibile.")
      activity.startActivity(Intent.createChooser(intent, "Apri documento"))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("deleteDocuments") { items: List<Map<String, String>> ->
      val deleted = mutableListOf<String>()
      val failures = mutableListOf<Map<String, String>>()
      for (item in items) {
        val id = item["id"] ?: ""
        try {
          val uri = checkedDocument(item["uri"] ?: "", item["token"] ?: "")
          val resolver = context().contentResolver
          resolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) throw IllegalStateException("File non piu' disponibile.")
            val mime = cursor.getString(0) ?: ""
            if (mime == DocumentsContract.Document.MIME_TYPE_DIR || isMedia(cursor.getString(1) ?: "", mime)) throw IllegalStateException("Non e' un documento eliminabile.")
          } ?: throw IllegalStateException("File non piu' disponibile.")
          if (!DocumentsContract.deleteDocument(resolver, uri)) throw IllegalStateException("Il fornitore non consente l'eliminazione.")
          deleted.add(id)
        } catch (error: Exception) {
          failures.add(mapOf("id" to id, "message" to (error.message ?: "Eliminazione non riuscita.")))
        }
      }
      mapOf("deletedIds" to deleted, "failures" to failures)
    }

    OnDestroy {
      pickerPromise?.reject("MODULE_CLOSED", "Selezione interrotta.", null)
      pickerPromise = null
    }
  }

  private fun context() = appContext.reactContext ?: throw IllegalStateException("Contesto non disponibile.")

  private fun checkedTree(token: String): Uri {
    val tree = Uri.parse(token)
    require(tree.scheme == "content" && DocumentsContract.isTreeUri(tree)) { "Cartella non valida." }
    require(context().contentResolver.persistedUriPermissions.any { it.uri == tree && it.isReadPermission }) { "Accesso alla cartella scaduto. Autorizzala nuovamente." }
    return tree
  }

  private fun checkedDocument(value: String, token: String): Uri {
    val tree = checkedTree(token)
    val uri = Uri.parse(value)
    require(uri.authority == tree.authority && DocumentsContract.isDocumentUri(context(), uri)) { "Documento non valido." }
    require(DocumentsContract.getTreeDocumentId(uri) == DocumentsContract.getTreeDocumentId(tree)) { "Documento fuori dalla cartella autorizzata." }
    val root = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
    require(DocumentsContract.getDocumentId(uri) != DocumentsContract.getTreeDocumentId(tree)) { "Non e' consentito operare sulla cartella radice." }
    // Tree URI grants are enforced by DocumentsProvider on every operation, including on API 24-28.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val descendant = try {
        DocumentsContract.isChildDocument(context().contentResolver, root, uri)
      } catch (_: UnsupportedOperationException) {
        null
      }
      require(descendant != false) { "Documento fuori dalla cartella autorizzata." }
    }
    return uri
  }

  private fun isMedia(name: String, mime: String): Boolean {
    val extension = name.substringAfterLast('.', "").lowercase()
    val detected = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: ""
    return mediaExtensions.contains(extension) || listOf(mime, detected).any { it.startsWith("image/") || it.startsWith("video/") || it.startsWith("audio/") }
  }
}
