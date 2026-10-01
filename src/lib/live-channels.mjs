// Official 24/7 news channels on YouTube, checked 2026-10-01: each handle's /live page
// resolved to a live video, the video was embeddable, and the oEmbed author matched the
// broadcaster (this caught an impostor channel). /api/live-news re-checks them every 15 min.

/** @typedef {{ id: string, name: string, handle: string, channelId: string, city: string, country: string, lat: number, lng: number, region: string, language: string, category: string }} LiveChannel */

/** @type {Record<string, string>} */
export const LANGUAGE_NAMES = {"en": "English", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ar": "Arabic", "ja": "Japanese", "hi": "Hindi", "ms": "Malay", "ur": "Urdu", "id": "Indonesian", "zh": "Chinese", "th": "Thai", "ko": "Korean", "tr": "Turkish", "uk": "Ukrainian"};

export const REGIONS = ['Americas', 'Europe', 'Middle East', 'Africa', 'Asia-Pacific'];

/** @type {LiveChannel[]} */
export const LIVE_CHANNELS = [
  { id: "africanews", name: "Africanews", handle: "africanews", channelId: "UC1_E8NeF5QHY2dtdLRBCCLA", city: "Pointe-Noire", country: 'CG', lat: -4.77, lng: 11.86, region: 'Africa', language: 'en', category: 'mainstream' },
  { id: "channelstelevision", name: "Channels TV", handle: "ChannelsTelevision", channelId: "UCEXGDNclvmg6RW0vipJYsTQ", city: "Lagos", country: 'NG', lat: 6.52, lng: 3.38, region: 'Africa', language: 'en', category: 'mainstream' },
  { id: "echorouknews", name: "Echorouk News", handle: "EchoroukNews", channelId: "UCR8l6OQCNzsAA26AEcCKcKw", city: "Algiers", country: 'DZ', lat: 36.75, lng: 3.06, region: 'Africa', language: 'ar', category: 'mainstream' },
  { id: "tvcnewsnigeria", name: "TVC News", handle: "TVCNewsNigeria", channelId: "UCgp4A6I8LCWrhUzn-5SbKvA", city: "Lagos", country: 'NG', lat: 6.6, lng: 3.35, region: 'Africa', language: 'en', category: 'mainstream' },
  { id: "abcnews", name: "ABC News Live", handle: "ABCNews", channelId: "UCBi2mrWuNuyYy4gbM6fU18Q", city: "New York", country: 'US', lat: 40.763, lng: -73.979, region: 'Americas', language: 'en', category: 'mainstream' },
  { id: "bloomberg", name: "Bloomberg Television", handle: "markets", channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", city: "New York", country: 'US', lat: 40.756, lng: -73.988, region: 'Americas', language: 'en', category: 'finance' },
  { id: "cspan", name: "C-SPAN", handle: "cspan", channelId: "UCb--64Gl51jIEVE-GLDAVTg", city: "Washington DC", country: 'US', lat: 38.897, lng: -77.036, region: 'Americas', language: 'en', category: 'government' },
  { id: "c5n", name: "C5N", handle: "c5n", channelId: "UCFgk2Q2mVO1BklRQhSv6p0w", city: "Buenos Aires", country: 'AR', lat: -34.6, lng: -58.38, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "cbc", name: "CBC News", handle: "CBCNews", channelId: "UCuFFtHWoLl5fauMMD5Ww2jA", city: "Toronto", country: 'CA', lat: 43.644, lng: -79.387, region: 'Americas', language: 'en', category: 'mainstream' },
  { id: "cbsnews", name: "CBS News 24/7", handle: "CBSNews", channelId: "UC8p1vwvWtl6T73JiExfWs1g", city: "New York", country: 'US', lat: 40.764, lng: -73.973, region: 'Americas', language: 'en', category: 'mainstream' },
  { id: "cnn", name: "CNN", handle: "CNN", channelId: "UCupvZG-5ko_eiXAupbDfxWw", city: "Atlanta", country: 'US', lat: 33.758, lng: -84.395, region: 'Americas', language: 'en', category: 'mainstream' },
  { id: "cnnbrasil", name: "CNN Brasil", handle: "cnnbrasil", channelId: "UCvdwhh_fDyWccR42-rReZLw", city: "São Paulo", country: 'BR', lat: -23.55, lng: -46.63, region: 'Americas', language: 'pt', category: 'mainstream' },
  { id: "cnnee", name: "CNN en Español", handle: "cnnee", channelId: "UC_lEiu6917IJz03TnntWUaQ", city: "Atlanta", country: 'US', lat: 33.76, lng: -84.39, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "dwespanol", name: "DW Español", handle: "dwespanol", channelId: "UCT4Jg8h03dD0iN3Pb5L0PMA", city: "Berlin", country: 'DE', lat: 52.51, lng: 13.37, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "france24_es", name: "France 24 Español", handle: "France24_es", channelId: "UCUdOoVWuWmgo1wByzcsyKDQ", city: "Paris", country: 'FR', lat: 48.83, lng: 2.27, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "livenowfox", name: "LiveNOW from FOX", handle: "LiveNOWFOX", channelId: "UCJg9wBPyKMNA5sRDnvzmkdg", city: "Los Angeles", country: 'US', lat: 34.05, lng: -118.24, region: 'Americas', language: 'en', category: 'mainstream' },
  { id: "milenio", name: "Milenio", handle: "MILENIO", channelId: "UCFxHplbcoJK9m70c4VyTIxg", city: "Mexico City", country: 'MX', lat: 19.43, lng: -99.13, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "nbcnews", name: "NBC News NOW", handle: "NBCNews", channelId: "UCeY0bbntWzzVIaj2z3QigXg", city: "New York", country: 'US', lat: 40.759, lng: -73.98, region: 'Americas', language: 'en', category: 'mainstream' },
  { id: "ntn24", name: "NTN24", handle: "NTN24", channelId: "UCEJs1fTF3KszRJGxJY14VrA", city: "Bogotá", country: 'CO', lat: 4.71, lng: -74.07, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "canalrcn", name: "Noticias RCN", handle: "CanalRCN", channelId: "UCSCAJJ1RJ4rfRTVW4gjYTpQ", city: "Bogotá", country: 'CO', lat: 4.65, lng: -74.1, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "todonoticias", name: "TN Todo Noticias", handle: "todonoticias", channelId: "UCj6PcyLvpnIRT_2W_mwa9Aw", city: "Buenos Aires", country: 'AR', lat: -34.61, lng: -58.4, region: 'Americas', language: 'es', category: 'mainstream' },
  { id: "abcnewsaustralia", name: "ABC News Australia", handle: "ABCNewsAustralia", channelId: "UCVgO39Bk5sMo66-6o6Spn6Q", city: "Sydney", country: 'AU', lat: -33.87, lng: 151.21, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "abscbnnews", name: "ABS-CBN News", handle: "ABSCBNNews", channelId: "UCE2606prvXQc_noEqKxVJXA", city: "Manila", country: 'PH', lat: 14.64, lng: 121.04, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "annnewsch", name: "ANN News", handle: "ANNnewsCH", channelId: "UCGCZAYq5Xxojl_tSXcVJhiQ", city: "Tokyo", country: 'JP', lat: 35.66, lng: 139.73, region: 'Asia-Pacific', language: 'ja', category: 'mainstream' },
  { id: "aajtak", name: "Aaj Tak", handle: "aajtak", channelId: "UCt4t-jeY85JegMlZ-E5UWtA", city: "Noida", country: 'IN', lat: 28.57, lng: 77.32, region: 'Asia-Pacific', language: 'hi', category: 'mainstream' },
  { id: "astroawani", name: "Astro Awani", handle: "astroawani", channelId: "UC5dYmq91e5_g54krpO06NJw", city: "Kuala Lumpur", country: 'MY', lat: 3.14, lng: 101.69, region: 'Asia-Pacific', language: 'ms', category: 'mainstream' },
  { id: "cgtn", name: "CGTN", handle: "CGTN", channelId: "UCgrNz-aDmcr2uuto8_DL2jg", city: "Beijing", country: 'CN', lat: 39.904, lng: 116.407, region: 'Asia-Pacific', language: 'en', category: 'state' },
  { id: "cna", name: "CNA", handle: "channelnewsasia", channelId: "UC83jt4dlz1Gjl58fzQrrKZg", city: "Singapore", country: 'SG', lat: 1.29, lng: 103.85, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "gmanews", name: "GMA News", handle: "gmanews", channelId: "UCqYw-CTd1dU2yGI71sEyqNw", city: "Quezon City", country: 'PH', lat: 14.65, lng: 121.03, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "geonews", name: "Geo News", handle: "geonews", channelId: "UC_vt34wimdCzdkrzVejwX9g", city: "Karachi", country: 'PK', lat: 24.86, lng: 67.01, region: 'Asia-Pacific', language: 'ur', category: 'mainstream' },
  { id: "indiatoday", name: "India Today", handle: "IndiaToday", channelId: "UCYPvAwZP8pZhSMW8qs7cVCw", city: "Noida", country: 'IN', lat: 28.58, lng: 77.31, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "kompastv", name: "Kompas TV", handle: "KompasTV", channelId: "UC5BMIWZe9isJXLZZWPWvBlg", city: "Jakarta", country: 'ID', lat: -6.21, lng: 106.85, region: 'Asia-Pacific', language: 'id', category: 'mainstream' },
  { id: "ndtv", name: "NDTV 24x7", handle: "NDTV", channelId: "UCZFMm1mMw0F81Z37aaEzTUA", city: "New Delhi", country: 'IN', lat: 28.61, lng: 77.21, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "nhkworld", name: "NHK World-Japan", handle: "NHKWORLDJAPAN", channelId: "UCSPEjw8F2nQDtmUKPFNF7_A", city: "Tokyo", country: 'JP', lat: 35.665, lng: 139.695, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "republicworld", name: "Republic World", handle: "RepublicWorld", channelId: "UCwqusr8YDwM-3mEYTDeJHzw", city: "Mumbai", country: 'IN', lat: 19.08, lng: 72.88, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "tbsnewsdig", name: "TBS NEWS DIG", handle: "tbsnewsdig", channelId: "UC6AG81pAkf6Lbi_1VC5NmPA", city: "Tokyo", country: 'JP', lat: 35.67, lng: 139.73, region: 'Asia-Pacific', language: 'ja', category: 'mainstream' },
  { id: "tvbsnews01", name: "TVBS News", handle: "TVBSNEWS01", channelId: "UC5nwNW4KdC0SzrhF9BXEYOQ", city: "Taipei", country: 'TW', lat: 25.03, lng: 121.57, region: 'Asia-Pacific', language: 'zh', category: 'mainstream' },
  { id: "thaipbs", name: "Thai PBS", handle: "ThaiPBS", channelId: "UC5TOFhyb_LxL2VG_Zenhpzw", city: "Bangkok", country: 'TH', lat: 13.76, lng: 100.5, region: 'Asia-Pacific', language: 'th', category: 'mainstream' },
  { id: "wion", name: "WION", handle: "WION", channelId: "UC_gUM8rL-Lrg6O3adPW9K1g", city: "New Delhi", country: 'IN', lat: 28.62, lng: 77.2, region: 'Asia-Pacific', language: 'en', category: 'mainstream' },
  { id: "ytnnews24", name: "YTN", handle: "YTNnews24", channelId: "UChlgI3UHCOnwUGzWzbJ3H5w", city: "Seoul", country: 'KR', lat: 37.57, lng: 126.98, region: 'Asia-Pacific', language: 'ko', category: 'mainstream' },
  { id: "bfmtv", name: "BFMTV", handle: "BFMTV", channelId: "UCXwDLMDV86ldKoFVc_g8P0g", city: "Paris", country: 'FR', lat: 48.84, lng: 2.27, region: 'Europe', language: 'fr', category: 'mainstream' },
  { id: "cnnturk", name: "CNN Türk", handle: "cnnturk", channelId: "UCV6zcRug6Hqp1UX_FdyUeBg", city: "Istanbul", country: 'TR', lat: 41.01, lng: 28.98, region: 'Europe', language: 'tr', category: 'mainstream' },
  { id: "dwnews", name: "DW News", handle: "DWNews", channelId: "UCknLrEdhRCp1aegoMqRaCZg", city: "Berlin", country: 'DE', lat: 52.508, lng: 13.376, region: 'Europe', language: 'en', category: 'mainstream' },
  { id: "espresotv", name: "Espreso TV", handle: "espresotv", channelId: "UCMEiyV8N2J93GdPNltPYM6w", city: "Kyiv", country: 'UA', lat: 50.45, lng: 30.52, region: 'Europe', language: 'uk', category: 'mainstream' },
  { id: "euronewsde", name: "Euronews Deutsch", handle: "euronewsde", channelId: "UCACdxU3VrJIJc7ujxtHWs1w", city: "Lyon", country: 'EU', lat: 45.76, lng: 4.84, region: 'Europe', language: 'de', category: 'mainstream' },
  { id: "euronews", name: "Euronews English", handle: "euronews", channelId: "UCSrZ3UV4jOidv8ppoVuvW9Q", city: "Lyon", country: 'EU', lat: 45.75, lng: 4.83, region: 'Europe', language: 'en', category: 'mainstream' },
  { id: "euronewses", name: "Euronews Español", handle: "euronewses", channelId: "UCyoGb3SMlTlB8CLGVH4c8Rw", city: "Lyon", country: 'EU', lat: 45.75, lng: 4.85, region: 'Europe', language: 'es', category: 'mainstream' },
  { id: "euronewsfr", name: "Euronews Français", handle: "euronewsfr", channelId: "UCW2QcKZiU8aUGg4yxCIditg", city: "Lyon", country: 'EU', lat: 45.76, lng: 4.83, region: 'Europe', language: 'fr', category: 'mainstream' },
  { id: "france24en", name: "France 24 English", handle: "France24_en", channelId: "UCQfwfsi5VrQ8yKZ-UWmAEFg", city: "Paris", country: 'FR', lat: 48.83, lng: 2.28, region: 'Europe', language: 'en', category: 'mainstream' },
  { id: "france24", name: "France 24 Français", handle: "France24", channelId: "UCCCPCZNChQdGa9EkATeye4g", city: "Paris", country: 'FR', lat: 48.83, lng: 2.29, region: 'Europe', language: 'fr', category: 'mainstream' },
  { id: "gbnewsonline", name: "GB News", handle: "GBNewsOnline", channelId: "UC0vn8ISa4LKMunLbzaXLnOQ", city: "London", country: 'GB', lat: 51.51, lng: -0.13, region: 'Europe', language: 'en', category: 'mainstream' },
  { id: "rtvenoticias", name: "RTVE Noticias", handle: "rtvenoticias", channelId: "UC7QZIf0dta-XPXsp9Hv4dTw", city: "Madrid", country: 'ES', lat: 40.42, lng: -3.7, region: 'Europe', language: 'es', category: 'mainstream' },
  { id: "skynews", name: "Sky News", handle: "SkyNews", channelId: "UCoMdktPbSTixAyNGwb-UYkQ", city: "London", country: 'GB', lat: 51.5, lng: -0.118, region: 'Europe', language: 'en', category: 'mainstream' },
  { id: "trthaber", name: "TRT Haber", handle: "TRTHaber", channelId: "UCBgTP2LOFVPmq15W-RH-WXA", city: "Ankara", country: 'TR', lat: 39.93, lng: 32.86, region: 'Europe', language: 'tr', category: 'state' },
  { id: "trtworld", name: "TRT World", handle: "TRTWorld", channelId: "UC7fWeaHhqgM4Ry-RMpM2YYw", city: "Istanbul", country: 'TR', lat: 41.02, lng: 28.97, region: 'Europe', language: 'en', category: 'state' },
  { id: "tv5monde", name: "TV5Monde", handle: "tv5monde", channelId: "UCJsZHPR1jqKu-soDmKNMBFg", city: "Paris", country: 'FR', lat: 48.85, lng: 2.35, region: 'Europe', language: 'fr', category: 'mainstream' },
  { id: "tvpworld", name: "TVP World", handle: "TVPWorld", channelId: "UCBjUPsHj7bXt24SUWNoZ0zA", city: "Warsaw", country: 'PL', lat: 52.23, lng: 21.01, region: 'Europe', language: 'en', category: 'state' },
  { id: "weltvideotv", name: "WELT", handle: "WELTVideoTV", channelId: "UCZMsvbAhhRblVGXmEXW8TSA", city: "Berlin", country: 'DE', lat: 52.52, lng: 13.4, region: 'Europe', language: 'de', category: 'mainstream' },
  { id: "franceinfo", name: "franceinfo", handle: "franceinfo", channelId: "UCO6K_kkdP-lnSCiO3tPx7WA", city: "Paris", country: 'FR', lat: 48.85, lng: 2.28, region: 'Europe', language: 'fr', category: 'mainstream' },
  { id: "alarabiya", name: "Al Arabiya", handle: "AlArabiya", channelId: "UCahpxixMCwoANAftn6IxkTg", city: "Dubai", country: 'AE', lat: 25.1, lng: 55.17, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "alhadath", name: "Al Hadath", handle: "alhadath", channelId: "UCrj5BGAhtWxDfqbza9T9hqA", city: "Dubai", country: 'AE', lat: 25.09, lng: 55.16, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "aljazeeraarabic", name: "Al Jazeera Arabic", handle: "aljazeera", channelId: "UCfiwzLy-8yKzIbsmZTzxDgw", city: "Doha", country: 'QA', lat: 25.29, lng: 51.53, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "aljazeera", name: "Al Jazeera English", handle: "aljazeeraenglish", channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg", city: "Doha", country: 'QA', lat: 25.286, lng: 51.534, region: 'Middle East', language: 'en', category: 'mainstream' },
  { id: "aljazeeramubasher", name: "Al Jazeera Mubasher", handle: "AlJazeeraMubasher", channelId: "UCCv1Pd24oPErw5S7zJWltnQ", city: "Doha", country: 'QA', lat: 25.28, lng: 51.52, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "dwarabic", name: "DW Arabic", handle: "dwarabic", channelId: "UC30ditU5JI16o5NbFsHde_Q", city: "Berlin", country: 'DE', lat: 52.5, lng: 13.38, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "france24_ar", name: "France 24 Arabic", handle: "france24_ar", channelId: "UCdTyuXgmJkG_O8_75eqej-w", city: "Paris", country: 'FR', lat: 48.82, lng: 2.28, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "skynewsarabia", name: "Sky News Arabia", handle: "skynewsarabia", channelId: "UCIJXOvggjKtCagMfxvcCzAA", city: "Abu Dhabi", country: 'AE', lat: 24.45, lng: 54.38, region: 'Middle East', language: 'ar', category: 'mainstream' },
  { id: "trtarabi", name: "TRT Arabi", handle: "TRTArabi", channelId: "UC5GvVahlgulCyo4cshSmbcg", city: "Istanbul", country: 'TR', lat: 41.0, lng: 28.96, region: 'Middle East', language: 'ar', category: 'state' },
];

/** Starting lineup for the news wall: strong English channels across regions. */
export const DEFAULT_WALL = ['aljazeera', 'skynews', 'dwnews', 'france24en', 'nhkworld', 'cna', 'abcnews', 'cbsnews', 'abcnewsaustralia'];
