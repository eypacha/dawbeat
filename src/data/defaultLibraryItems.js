export const DEFAULT_LIBRARY_ITEMS = [
  {
    "id": "ELWMzbIkZ-Cgb72hiZ_u1",
    "name": "POW techno",
    "formula": "((t>>(t>>12&1))&65535)**((t>>10&3)+1)|(t<<4&16383)/(t>>5&127)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "JprEgUEhXRkDf9wNGkX5b",
    "name": "TWO MILLION alarm clocks",
    "formula": "t*t/(t>>12&t>>8)<<7|t*(t>>11&t>>6)<<7",
    "leftFormula": "t*t/(t>>12&t>>8)<<7|t*(t>>11&t>>6)<<7",
    "rightFormula": "t*t/(t>>11&t>>6)<<7|t*(t>>11&t>>6)<<7",
    "formulaStereo": true,
    "duration": 16
  },
  {
    "id": "oLP7f34rBMsoo2kXaZbE4",
    "name": "ÐiskΩtroÑ",
    "formula": "((t&'0032'[t>>10&3]*t|t>>5|t*6&t>>(t>>10-(t>>14&1)+!(~t>>12&1^t>>13&1)&1?14:10)|(t&20?1:5+(3*t>>9&31)))-(t>>5)&255)/2+64+32*cos(99*(3+(t>>10&4))/(t%4096+1)**.1)**2+(~t>>7-!(t>>12&3)&12)*cos(t**3)**2",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "oCY_KD_bFLlvsOGe9_NwH",
    "name": "Drifting electricity",
    "formula": "t>>t%(t%2?[61,51,31,41][(t>>14)%4]:34)+(t>>6)|128*cos((t>>1)/314.159)+128",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "Lz3Hz1ke6p95nYqRgXcd9",
    "name": "Driving my 8 bit car",
    "formula": "52445*((t>>6)*t>>430)%1E3",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "GZt2Y6ca10L6YXg_VnFgT",
    "name": "Funeral",
    "formula": "(((1<t/16E3%2?3*t|16*t:2*t|16*t)|123)+(1<t/32E3%2?500>t%1E3?18.3*t:0:500>t%1E3?18.9*t:0)|t/1E3<<4)-128+(50>t%1E3?t<<t/3:0)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "po0kipJTwYne3YOZqkLDT",
    "name": "Trill",
    "formula": "64*sin(sin(t/100)-t/(2+(t>>10&t>>12)%9))+128",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "HxdxQEBB9WXy7eVD8MVjK",
    "name": "Harmony",
    "formula": "t%50.01+t%40.1+t%30.1+t%60.01",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 5
  },
  {
    "id": "7YUHlGaaPTpbfdsugJ-sb",
    "name": "Never gonna give you up",
    "formula": "(t<<3)*[8/9,1,9/8,6/5,4/3,3/2,0][[0xd2d2c8,0xce4088,0xca32c8,0x8e4009][t>>14&3]>>(0x3dbe4688>>((t>>10&15)>9?18:t>>10&15)*3&7)*3&7]",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "o2_hUsw6A842lApBIe-FM",
    "name": "No limit",
    "formula": "127*sin(2e3/(t&4095))*.2+(t&4095)/8191*((t<<1)*(1+.333*(32767<(t&65535))+.177*(49151<(t&65535)))&255)*.4+.25*((t>>4^t>>6|t>>10|3*t*(1+.333*(32767<(t&65535))+.177*(49151<(t&65535))))&255)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "Y1qr5vCZXLEflVEcXG4ai",
    "name": "Baseline, melody, snare",
    "formula": "(4*t*(t>>>11&1?1:0)*(t>>>11&8?0:1)+2*t*(t>>>10&1?1:0)*(t>>>10&128?0:1)+4*t*(t>>>10&1?1:0)*(t>>>10&128?1:0)+t*sin(t)*(t>>>10&4?1:0)*(t>>>10&1?1:0))%256",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "dxMix_vwMft_Ffc9Ce2tW",
    "name": "Psychedelica",
    "formula": "t^t%1001+t^t%1002",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 7
  },
  {
    "id": "x3YqSd8PxIM-jK1IScPUE",
    "name": "Brain burner",
    "formula": "129*t%(t>>7)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "OYpzSGNOo6Lltm5ZXcn16",
    "name": "Song",
    "formula": "(t&t+t/256)-t*(t>>15)&64",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "V_vKjLpH8tmqlc_bi1it5",
    "name": "New sawtooth music",
    "formula": "t*((t-2296&t)>>11)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "SLe4phmfdY-aI8WxYzA-P",
    "name": "Fiesta",
    "formula": "(t*(3+(4+(t>>12)%2)*(t>>10)%7)&128)*(.15+(t>>9)%2)/2",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "0TMZXemw9tIVHvS2BDm5u",
    "name": "Sadly",
    "formula": "43*(t>>41|t>>2)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "sFVbAoa8p8WtPCA9Vwm7m",
    "name": "Zemfira",
    "formula": "430*(5*t>>11|5*t>>1)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "sKYRpPEg5Bx0xw_8Xo136",
    "name": "Glissando",
    "formula": "t*t/(t>>13^t>>8)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "pFQFKATe2OiKoaXotZBz7",
    "name": "ONE MILLION alarm clocks",
    "formula": "t*t/(t>>12&t>>8)<<7",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "to-xysBUoLkaFUZq492ki",
    "name": "Clean melody",
    "formula": "t*(t>>9|t>>13)&16",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "93ozAJaDuDGGeKVPtREEk",
    "name": "t >> 4",
    "formula": "t >> 4",
    "leftFormula": "t >> 4",
    "rightFormula": "t >> 4",
    "formulaStereo": false,
    "duration": 3
  },
  {
    "id": "FD1kNkshOZF5V-tTEhkjs",
    "name": "Arcade game",
    "formula": "t*((t>>9|t>>13)&15)&129",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "LIIGSGfWwyQAb2CNTOEIJ",
    "name": "George 2",
    "formula": "t*(t^t>>20*(t>>11))",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "yGl4iq8oANJzwzcvW5p5Y",
    "name": "George",
    "formula": "20*t*t*(t>>11)/7",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 8
  },
  {
    "id": "jLz4X3W1m8QjwuLRKU7zR",
    "name": "Droid",
    "formula": "t>>6&1?t>>5:-t>>4",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 4
  },
  {
    "id": "ONovjPTSw7d4Rpv_YuvCQ",
    "name": "Good old fractal melody",
    "formula": "(t>>9^(t>>9)-1^1)%13*t",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 5.5
  },
  {
    "id": "bBxQwjWYOzkhHSdLm5zGp",
    "name": "Music for a C64 game",
    "formula": "t*(t>>(t&4096?t*t>>12:t>>12))|t<<(t>>8)|t>>4",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 5.25
  },
  {
    "id": "QH8JUeAlH8qTa83F1mtzM",
    "name": "A jaunty tune",
    "formula": "t*(t>>12)*64+(t>>1)*(t>>10)*(t>>11)*48>>((t>>16|t>>17)&1)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 5.25
  },
  {
    "id": "ZNpnSA69p1TLV2pqFgJpR",
    "name": "Generic 3/4",
    "formula": "t&598?t>>4:t>>10",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 4
  },
  {
    "id": "UBURceKxAbzUKy9DPLIir",
    "name": "Lemmings March",
    "formula": "t>>5|t<<4|t&1023^1981|t-67>>4",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 4
  },
  {
    "id": "iemTZ8N89wzVx3b9W28up",
    "name": "Fractal trees",
    "formula": "t|t%255|t%257",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "00Yupva0zkhaB-igPHNKD",
    "name": "Mr Arpeggiator 1",
    "formula": "t/8>>(t>>9)*t/((t>>14&3)+4)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "UPXxXCPvAdTlP2z1jC265",
    "name": "Street Surfer",
    "formula": "t&4096?t/2*(t^t%255)|t>>5:t/8|(t&8192?4*t:t)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 4
  },
  {
    "id": "IRhUCOXYtQRsveodwAaCT",
    "name": "CA98",
    "formula": "t*(0xCA98CA98>>(t>>9&30)&15)|t>>8",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "QN2lik0uK2gKNc84cY7B2",
    "name": "Bear",
    "formula": "t+(t&t^t>>6)-t*(t>>9&(t%16?2:6)&t>>9)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 4
  },
  {
    "id": "7Yf9kCslugqEmTKgIApYy",
    "name": "Alien dungeon",
    "formula": "t*(t&16384?7:5)*(3+(3&t>>14))>>(3&t>>9)|t>>6",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "_SkmYeD5XdG1xoczLI6AZ",
    "name": "The 42 Melody",
    "formula": "t*(42&t>>10)",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  },
  {
    "id": "f3mQ_3koMz7rTnGJkjnAb",
    "name": "Sierpinsky Minimal",
    "formula": "t&t>>8",
    "leftFormula": "",
    "rightFormula": "",
    "formulaStereo": false,
    "duration": 16
  }
]

export function createDefaultLibraryItems() {
  return DEFAULT_LIBRARY_ITEMS.map((item) => ({ ...item }))
}