Pod::Spec.new do |s|
  s.name = 'DocumentLibrary'
  s.version = '1.0.0'
  s.summary = 'User-authorized document folder access for Photinder'
  s.description = 'Lists, opens and deletes documents in explicitly selected folders.'
  s.license = { :type => 'MIT' }
  s.author = 'Photinder'
  s.homepage = 'https://expo.dev'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UIKit', 'QuickLook', 'UniformTypeIdentifiers'
  s.source_files = '**/*.{h,m,swift}'
end
