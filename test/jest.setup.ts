if (typeof global.btoa === 'undefined') {
  global.btoa = (input: string) => Buffer.from(input, 'binary').toString('base64');
}

if (typeof global.atob === 'undefined') {
  global.atob = (input: string) => Buffer.from(input, 'base64').toString('binary');
}
