import ExpoModulesCore
import UIKit
import QuickLook
import UniformTypeIdentifiers

public class DocumentLibraryModule: Module {
  private var pickerDelegate: FolderPickerDelegate?
  private var previewDelegate: DocumentPreviewDelegate?

  public func definition() -> ModuleDefinition {
    Name("DocumentLibrary")

    AsyncFunction("pickFolder") { (promise: Promise) in
      guard self.pickerDelegate == nil else {
        promise.reject("PICKER_BUSY", "Il selettore e' gia' aperto.")
        return
      }
      guard let controller = self.appContext?.utilities?.currentViewController() else {
        promise.reject("NO_CONTROLLER", "Schermata non disponibile.")
        return
      }
      let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
      let delegate = FolderPickerDelegate(promise: promise) { self.pickerDelegate = nil }
      self.pickerDelegate = delegate
      picker.delegate = delegate
      controller.present(picker, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("listDocuments") { (token: String) -> [[String: Any]] in
      let root = try resolveFolder(token)
      guard root.startAccessingSecurityScopedResource() else { throw DocumentAccessError("Accesso alla cartella scaduto. Autorizzala nuovamente.") }
      defer { root.stopAccessingSecurityScopedResource() }
      var results = [[String: Any]]()
      var readError: Error?
      var coordinationError: NSError?
      NSFileCoordinator().coordinate(readingItemAt: root, options: [], error: &coordinationError) { folder in
        do {
          let keys: [URLResourceKey] = [.isRegularFileKey, .isSymbolicLinkKey, .contentModificationDateKey, .fileSizeKey, .contentTypeKey]
          guard let enumerator = FileManager.default.enumerator(at: folder, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles, .skipsPackageDescendants], errorHandler: { _, error in
            readError = error
            return false
          }) else { throw DocumentAccessError("Impossibile leggere la cartella.") }
          for case let url as URL in enumerator {
            let values = try url.resourceValues(forKeys: Set(keys))
            if values.isSymbolicLink == true { enumerator.skipDescendants(); continue }
            guard values.isRegularFile == true, !isMedia(url, values.contentType) else { continue }
            results.append([
              "id": url.absoluteString, "uri": url.absoluteString, "filename": url.lastPathComponent,
              "mediaType": "document", "creationTime": (values.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000,
              "mimeType": values.contentType?.preferredMIMEType ?? "application/octet-stream",
              "size": values.fileSize ?? 0
            ])
          }
        } catch { readError = error }
      }
      if let error = coordinationError { throw error }
      if let error = readError { throw error }
      return results
    }

    AsyncFunction("openDocument") { (value: String, token: String) in
      guard self.previewDelegate == nil else { throw DocumentAccessError("Un documento e' gia' aperto.") }
      let root = try resolveFolder(token)
      guard root.startAccessingSecurityScopedResource() else { throw DocumentAccessError("Autorizza nuovamente la cartella.") }
      do {
        let url = try checkedDocument(value, root)
        guard QLPreviewController.canPreview(url as NSURL) else { throw DocumentAccessError("Anteprima non disponibile per questo formato sul dispositivo.") }
        guard let controller = self.appContext?.utilities?.currentViewController() else { throw DocumentAccessError("Schermata non disponibile.") }
        let preview = QLPreviewController()
        let delegate = DocumentPreviewDelegate(url: url, root: root) { self.previewDelegate = nil }
        self.previewDelegate = delegate
        preview.dataSource = delegate
        preview.delegate = delegate
        controller.present(preview, animated: true)
      } catch {
        root.stopAccessingSecurityScopedResource()
        throw error
      }
    }.runOnQueue(.main)

    AsyncFunction("deleteDocuments") { (items: [[String: String]]) -> [String: Any] in
      var deleted = [String]()
      var failures = [[String: String]]()
      for item in items {
        let id = item["id"] ?? ""
        do {
          let root = try resolveFolder(item["token"] ?? "")
          guard root.startAccessingSecurityScopedResource() else { throw DocumentAccessError("Autorizza nuovamente la cartella.") }
          defer { root.stopAccessingSecurityScopedResource() }
          let url = try checkedDocument(item["uri"] ?? "", root)
          let values = try url.resourceValues(forKeys: [.isRegularFileKey, .contentTypeKey])
          guard values.isRegularFile == true, !isMedia(url, values.contentType) else { throw DocumentAccessError("Non e' un documento eliminabile.") }
          var coordinationError: NSError?
          var deleteError: Error?
          NSFileCoordinator().coordinate(writingItemAt: url, options: .forDeleting, error: &coordinationError) { coordinatedURL in
            do { try FileManager.default.removeItem(at: coordinatedURL) } catch { deleteError = error }
          }
          if let error = coordinationError { throw error }
          if let error = deleteError { throw error }
          deleted.append(id)
        } catch {
          failures.append(["id": id, "message": error.localizedDescription])
        }
      }
      return ["deletedIds": deleted, "failures": failures]
    }
  }
}

private struct DocumentAccessError: LocalizedError {
  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message }
}

private func resolveFolder(_ token: String) throws -> URL {
  guard let data = Data(base64Encoded: token) else { throw DocumentAccessError("Cartella non valida.") }
  var stale = false
  let url = try URL(resolvingBookmarkData: data, options: [.withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale)
  return url
}

private func checkedDocument(_ value: String, _ root: URL) throws -> URL {
  guard let url = URL(string: value), url.isFileURL else { throw DocumentAccessError("Documento non valido.") }
  let normalized = url.resolvingSymlinksInPath().standardizedFileURL
  let prefix = root.resolvingSymlinksInPath().standardizedFileURL.path + "/"
  guard normalized.path.hasPrefix(prefix) else { throw DocumentAccessError("Documento fuori dalla cartella autorizzata.") }
  return normalized
}

private func isMedia(_ url: URL, _ type: UTType?) -> Bool {
  let detected = type ?? UTType(filenameExtension: url.pathExtension)
  return detected?.conforms(to: .image) == true || detected?.conforms(to: .audiovisualContent) == true
}

private final class FolderPickerDelegate: NSObject, UIDocumentPickerDelegate {
  let promise: Promise
  let finished: () -> Void
  init(promise: Promise, finished: @escaping () -> Void) { self.promise = promise; self.finished = finished }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { promise.resolve(nil); finished() }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    defer { finished() }
    guard let url = urls.first, url.startAccessingSecurityScopedResource() else { promise.reject("FOLDER_ACCESS", "Accesso alla cartella non concesso."); return }
    defer { url.stopAccessingSecurityScopedResource() }
    do {
      let bookmark = try url.bookmarkData(options: [.minimalBookmark], includingResourceValuesForKeys: nil, relativeTo: nil)
      promise.resolve(["token": bookmark.base64EncodedString(), "name": url.lastPathComponent])
    } catch { promise.reject("FOLDER_ACCESS", error.localizedDescription) }
  }
}

private final class DocumentPreviewDelegate: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
  let url: URL
  let root: URL
  let finished: () -> Void
  private var closed = false
  init(url: URL, root: URL, finished: @escaping () -> Void) { self.url = url; self.root = root; self.finished = finished }
  func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { url as NSURL }
  func previewControllerDidDismiss(_ controller: QLPreviewController) {
    if !closed { closed = true; root.stopAccessingSecurityScopedResource(); finished() }
  }
  deinit { if !closed { root.stopAccessingSecurityScopedResource() } }
}
