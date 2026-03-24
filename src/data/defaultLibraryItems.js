export const DEFAULT_LIBRARY_ITEMS = [
  {
    id: 'FD1kNkshOZF5V-tTEhkjs',
    name: 'Arcade game',
    formula: 't*((t>>9|t>>13)&15)&129',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  },
  {
    id: 'LIIGSGfWwyQAb2CNTOEIJ',
    name: 'George 2',
    formula: 't*(t^t>>20*(t>>11))',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 8
  },
  {
    id: 'yGl4iq8oANJzwzcvW5p5Y',
    name: 'George',
    formula: '20*t*t*(t>>11)/7',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 8
  },
  {
    id: 'jLz4X3W1m8QjwuLRKU7zR',
    name: 'Droid',
    formula: 't>>6&1?t>>5:-t>>4',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 4
  },
  {
    id: 'ONovjPTSw7d4Rpv_YuvCQ',
    name: 'Good old fractal melody',
    formula: '(t>>9^(t>>9)-1^1)%13*t',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 5.5
  },
  {
    id: 'bBxQwjWYOzkhHSdLm5zGp',
    name: 'Music for a C64 game',
    formula: 't*(t>>(t&4096?t*t>>12:t>>12))|t<<(t>>8)|t>>4',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 5.25
  },
  {
    id: 'QH8JUeAlH8qTa83F1mtzM',
    name: 'A jaunty tune',
    formula: 't*(t>>12)*64+(t>>1)*(t>>10)*(t>>11)*48>>((t>>16|t>>17)&1)',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 5.25
  },
  {
    id: 'ZNpnSA69p1TLV2pqFgJpR',
    name: 'Generic 3/4',
    formula: 't&598?t>>4:t>>10',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 4
  },
  {
    id: 'UBURceKxAbzUKy9DPLIir',
    name: 'Lemmings March',
    formula: 't>>5|t<<4|t&1023^1981|t-67>>4',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 4
  },
  {
    id: 'iemTZ8N89wzVx3b9W28up',
    name: 'Fractal trees',
    formula: 't|t%255|t%257',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  },
  {
    id: '00Yupva0zkhaB-igPHNKD',
    name: 'Mr Arpeggiator 1',
    formula: 't/8>>(t>>9)*t/((t>>14&3)+4)',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  },
  {
    id: 'UPXxXCPvAdTlP2z1jC265',
    name: 'Street Surfer',
    formula: 't&4096?t/2*(t^t%255)|t>>5:t/8|(t&8192?4*t:t)',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 4
  },
  {
    id: 'IRhUCOXYtQRsveodwAaCT',
    name: 'CA98',
    formula: 't*(0xCA98CA98>>(t>>9&30)&15)|t>>8',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  },
  {
    id: 'QN2lik0uK2gKNc84cY7B2',
    name: 'Bear',
    formula: 't+(t&t^t>>6)-t*(t>>9&(t%16?2:6)&t>>9)',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 4
  },
  {
    id: '7Yf9kCslugqEmTKgIApYy',
    name: 'Alien dungeon',
    formula: 't*(t&16384?7:5)*(3+(3&t>>14))>>(3&t>>9)|t>>6',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  },
  {
    id: '_SkmYeD5XdG1xoczLI6AZ',
    name: 'The 42 Melody',
    formula: 't*(42&t>>10)',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  },
  {
    id: 'f3mQ_3koMz7rTnGJkjnAb',
    name: 'Sierpinsky Minimal',
    formula: 't&t>>8',
    leftFormula: '',
    rightFormula: '',
    formulaStereo: false,
    duration: 16
  }
]

export function createDefaultLibraryItems() {
  return DEFAULT_LIBRARY_ITEMS.map((item) => ({ ...item }))
}