Pod::Spec.new do |s|
  s.name           = 'ExcelReaderModule'
  s.version        = '1.0.0'
  s.summary        = 'Excel reader and image extraction module'
  s.description    = 'Provides native XLSX row chunk reading, sheet listing and image extraction'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'ZIPFoundation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
