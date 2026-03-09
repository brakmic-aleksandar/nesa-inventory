Pod::Spec.new do |s|
  s.name           = 'FileBookmarkModule'
  s.version        = '1.0.0'
  s.summary        = 'File bookmark and iOS document picker module'
  s.description    = 'Provides bookmark creation/resolution and open-in-place Excel file picker'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
