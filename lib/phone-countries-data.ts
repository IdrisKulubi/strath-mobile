import type { CountryCode } from 'libphonenumber-js';

export interface StaticCountryOption {
    code: CountryCode;
    callingCode: string;
    name: string;
}

export const PHONE_COUNTRIES: StaticCountryOption[] = [
    {
        "code": "AF",
        "callingCode": "93",
        "name": "Afghanistan"
    },
    {
        "code": "AX",
        "callingCode": "358",
        "name": "Åland Islands"
    },
    {
        "code": "AL",
        "callingCode": "355",
        "name": "Albania"
    },
    {
        "code": "DZ",
        "callingCode": "213",
        "name": "Algeria"
    },
    {
        "code": "AS",
        "callingCode": "1",
        "name": "American Samoa"
    },
    {
        "code": "AD",
        "callingCode": "376",
        "name": "Andorra"
    },
    {
        "code": "AO",
        "callingCode": "244",
        "name": "Angola"
    },
    {
        "code": "AI",
        "callingCode": "1",
        "name": "Anguilla"
    },
    {
        "code": "AG",
        "callingCode": "1",
        "name": "Antigua & Barbuda"
    },
    {
        "code": "AR",
        "callingCode": "54",
        "name": "Argentina"
    },
    {
        "code": "AM",
        "callingCode": "374",
        "name": "Armenia"
    },
    {
        "code": "AW",
        "callingCode": "297",
        "name": "Aruba"
    },
    {
        "code": "AC",
        "callingCode": "247",
        "name": "Ascension Island"
    },
    {
        "code": "AU",
        "callingCode": "61",
        "name": "Australia"
    },
    {
        "code": "AT",
        "callingCode": "43",
        "name": "Austria"
    },
    {
        "code": "AZ",
        "callingCode": "994",
        "name": "Azerbaijan"
    },
    {
        "code": "BS",
        "callingCode": "1",
        "name": "Bahamas"
    },
    {
        "code": "BH",
        "callingCode": "973",
        "name": "Bahrain"
    },
    {
        "code": "BD",
        "callingCode": "880",
        "name": "Bangladesh"
    },
    {
        "code": "BB",
        "callingCode": "1",
        "name": "Barbados"
    },
    {
        "code": "BY",
        "callingCode": "375",
        "name": "Belarus"
    },
    {
        "code": "BE",
        "callingCode": "32",
        "name": "Belgium"
    },
    {
        "code": "BZ",
        "callingCode": "501",
        "name": "Belize"
    },
    {
        "code": "BJ",
        "callingCode": "229",
        "name": "Benin"
    },
    {
        "code": "BM",
        "callingCode": "1",
        "name": "Bermuda"
    },
    {
        "code": "BT",
        "callingCode": "975",
        "name": "Bhutan"
    },
    {
        "code": "BO",
        "callingCode": "591",
        "name": "Bolivia"
    },
    {
        "code": "BA",
        "callingCode": "387",
        "name": "Bosnia & Herzegovina"
    },
    {
        "code": "BW",
        "callingCode": "267",
        "name": "Botswana"
    },
    {
        "code": "BR",
        "callingCode": "55",
        "name": "Brazil"
    },
    {
        "code": "IO",
        "callingCode": "246",
        "name": "British Indian Ocean Territory"
    },
    {
        "code": "VG",
        "callingCode": "1",
        "name": "British Virgin Islands"
    },
    {
        "code": "BN",
        "callingCode": "673",
        "name": "Brunei"
    },
    {
        "code": "BG",
        "callingCode": "359",
        "name": "Bulgaria"
    },
    {
        "code": "BF",
        "callingCode": "226",
        "name": "Burkina Faso"
    },
    {
        "code": "BI",
        "callingCode": "257",
        "name": "Burundi"
    },
    {
        "code": "KH",
        "callingCode": "855",
        "name": "Cambodia"
    },
    {
        "code": "CM",
        "callingCode": "237",
        "name": "Cameroon"
    },
    {
        "code": "CA",
        "callingCode": "1",
        "name": "Canada"
    },
    {
        "code": "CV",
        "callingCode": "238",
        "name": "Cape Verde"
    },
    {
        "code": "BQ",
        "callingCode": "599",
        "name": "Caribbean Netherlands"
    },
    {
        "code": "KY",
        "callingCode": "1",
        "name": "Cayman Islands"
    },
    {
        "code": "CF",
        "callingCode": "236",
        "name": "Central African Republic"
    },
    {
        "code": "TD",
        "callingCode": "235",
        "name": "Chad"
    },
    {
        "code": "CL",
        "callingCode": "56",
        "name": "Chile"
    },
    {
        "code": "CN",
        "callingCode": "86",
        "name": "China"
    },
    {
        "code": "CX",
        "callingCode": "61",
        "name": "Christmas Island"
    },
    {
        "code": "CC",
        "callingCode": "61",
        "name": "Cocos (Keeling) Islands"
    },
    {
        "code": "CO",
        "callingCode": "57",
        "name": "Colombia"
    },
    {
        "code": "KM",
        "callingCode": "269",
        "name": "Comoros"
    },
    {
        "code": "CG",
        "callingCode": "242",
        "name": "Congo - Brazzaville"
    },
    {
        "code": "CD",
        "callingCode": "243",
        "name": "Congo - Kinshasa"
    },
    {
        "code": "CK",
        "callingCode": "682",
        "name": "Cook Islands"
    },
    {
        "code": "CR",
        "callingCode": "506",
        "name": "Costa Rica"
    },
    {
        "code": "CI",
        "callingCode": "225",
        "name": "Côte d’Ivoire"
    },
    {
        "code": "HR",
        "callingCode": "385",
        "name": "Croatia"
    },
    {
        "code": "CU",
        "callingCode": "53",
        "name": "Cuba"
    },
    {
        "code": "CW",
        "callingCode": "599",
        "name": "Curaçao"
    },
    {
        "code": "CY",
        "callingCode": "357",
        "name": "Cyprus"
    },
    {
        "code": "CZ",
        "callingCode": "420",
        "name": "Czechia"
    },
    {
        "code": "DK",
        "callingCode": "45",
        "name": "Denmark"
    },
    {
        "code": "DJ",
        "callingCode": "253",
        "name": "Djibouti"
    },
    {
        "code": "DM",
        "callingCode": "1",
        "name": "Dominica"
    },
    {
        "code": "DO",
        "callingCode": "1",
        "name": "Dominican Republic"
    },
    {
        "code": "EC",
        "callingCode": "593",
        "name": "Ecuador"
    },
    {
        "code": "EG",
        "callingCode": "20",
        "name": "Egypt"
    },
    {
        "code": "SV",
        "callingCode": "503",
        "name": "El Salvador"
    },
    {
        "code": "GQ",
        "callingCode": "240",
        "name": "Equatorial Guinea"
    },
    {
        "code": "ER",
        "callingCode": "291",
        "name": "Eritrea"
    },
    {
        "code": "EE",
        "callingCode": "372",
        "name": "Estonia"
    },
    {
        "code": "SZ",
        "callingCode": "268",
        "name": "Eswatini"
    },
    {
        "code": "ET",
        "callingCode": "251",
        "name": "Ethiopia"
    },
    {
        "code": "FK",
        "callingCode": "500",
        "name": "Falkland Islands"
    },
    {
        "code": "FO",
        "callingCode": "298",
        "name": "Faroe Islands"
    },
    {
        "code": "FJ",
        "callingCode": "679",
        "name": "Fiji"
    },
    {
        "code": "FI",
        "callingCode": "358",
        "name": "Finland"
    },
    {
        "code": "FR",
        "callingCode": "33",
        "name": "France"
    },
    {
        "code": "GF",
        "callingCode": "594",
        "name": "French Guiana"
    },
    {
        "code": "PF",
        "callingCode": "689",
        "name": "French Polynesia"
    },
    {
        "code": "GA",
        "callingCode": "241",
        "name": "Gabon"
    },
    {
        "code": "GM",
        "callingCode": "220",
        "name": "Gambia"
    },
    {
        "code": "GE",
        "callingCode": "995",
        "name": "Georgia"
    },
    {
        "code": "DE",
        "callingCode": "49",
        "name": "Germany"
    },
    {
        "code": "GH",
        "callingCode": "233",
        "name": "Ghana"
    },
    {
        "code": "GI",
        "callingCode": "350",
        "name": "Gibraltar"
    },
    {
        "code": "GR",
        "callingCode": "30",
        "name": "Greece"
    },
    {
        "code": "GL",
        "callingCode": "299",
        "name": "Greenland"
    },
    {
        "code": "GD",
        "callingCode": "1",
        "name": "Grenada"
    },
    {
        "code": "GP",
        "callingCode": "590",
        "name": "Guadeloupe"
    },
    {
        "code": "GU",
        "callingCode": "1",
        "name": "Guam"
    },
    {
        "code": "GT",
        "callingCode": "502",
        "name": "Guatemala"
    },
    {
        "code": "GG",
        "callingCode": "44",
        "name": "Guernsey"
    },
    {
        "code": "GN",
        "callingCode": "224",
        "name": "Guinea"
    },
    {
        "code": "GW",
        "callingCode": "245",
        "name": "Guinea-Bissau"
    },
    {
        "code": "GY",
        "callingCode": "592",
        "name": "Guyana"
    },
    {
        "code": "HT",
        "callingCode": "509",
        "name": "Haiti"
    },
    {
        "code": "HN",
        "callingCode": "504",
        "name": "Honduras"
    },
    {
        "code": "HK",
        "callingCode": "852",
        "name": "Hong Kong SAR China"
    },
    {
        "code": "HU",
        "callingCode": "36",
        "name": "Hungary"
    },
    {
        "code": "IS",
        "callingCode": "354",
        "name": "Iceland"
    },
    {
        "code": "IN",
        "callingCode": "91",
        "name": "India"
    },
    {
        "code": "ID",
        "callingCode": "62",
        "name": "Indonesia"
    },
    {
        "code": "IR",
        "callingCode": "98",
        "name": "Iran"
    },
    {
        "code": "IQ",
        "callingCode": "964",
        "name": "Iraq"
    },
    {
        "code": "IE",
        "callingCode": "353",
        "name": "Ireland"
    },
    {
        "code": "IM",
        "callingCode": "44",
        "name": "Isle of Man"
    },
    {
        "code": "IL",
        "callingCode": "972",
        "name": "Israel"
    },
    {
        "code": "IT",
        "callingCode": "39",
        "name": "Italy"
    },
    {
        "code": "JM",
        "callingCode": "1",
        "name": "Jamaica"
    },
    {
        "code": "JP",
        "callingCode": "81",
        "name": "Japan"
    },
    {
        "code": "JE",
        "callingCode": "44",
        "name": "Jersey"
    },
    {
        "code": "JO",
        "callingCode": "962",
        "name": "Jordan"
    },
    {
        "code": "KZ",
        "callingCode": "7",
        "name": "Kazakhstan"
    },
    {
        "code": "KE",
        "callingCode": "254",
        "name": "Kenya"
    },
    {
        "code": "KI",
        "callingCode": "686",
        "name": "Kiribati"
    },
    {
        "code": "XK",
        "callingCode": "383",
        "name": "Kosovo"
    },
    {
        "code": "KW",
        "callingCode": "965",
        "name": "Kuwait"
    },
    {
        "code": "KG",
        "callingCode": "996",
        "name": "Kyrgyzstan"
    },
    {
        "code": "LA",
        "callingCode": "856",
        "name": "Laos"
    },
    {
        "code": "LV",
        "callingCode": "371",
        "name": "Latvia"
    },
    {
        "code": "LB",
        "callingCode": "961",
        "name": "Lebanon"
    },
    {
        "code": "LS",
        "callingCode": "266",
        "name": "Lesotho"
    },
    {
        "code": "LR",
        "callingCode": "231",
        "name": "Liberia"
    },
    {
        "code": "LY",
        "callingCode": "218",
        "name": "Libya"
    },
    {
        "code": "LI",
        "callingCode": "423",
        "name": "Liechtenstein"
    },
    {
        "code": "LT",
        "callingCode": "370",
        "name": "Lithuania"
    },
    {
        "code": "LU",
        "callingCode": "352",
        "name": "Luxembourg"
    },
    {
        "code": "MO",
        "callingCode": "853",
        "name": "Macao SAR China"
    },
    {
        "code": "MG",
        "callingCode": "261",
        "name": "Madagascar"
    },
    {
        "code": "MW",
        "callingCode": "265",
        "name": "Malawi"
    },
    {
        "code": "MY",
        "callingCode": "60",
        "name": "Malaysia"
    },
    {
        "code": "MV",
        "callingCode": "960",
        "name": "Maldives"
    },
    {
        "code": "ML",
        "callingCode": "223",
        "name": "Mali"
    },
    {
        "code": "MT",
        "callingCode": "356",
        "name": "Malta"
    },
    {
        "code": "MH",
        "callingCode": "692",
        "name": "Marshall Islands"
    },
    {
        "code": "MQ",
        "callingCode": "596",
        "name": "Martinique"
    },
    {
        "code": "MR",
        "callingCode": "222",
        "name": "Mauritania"
    },
    {
        "code": "MU",
        "callingCode": "230",
        "name": "Mauritius"
    },
    {
        "code": "YT",
        "callingCode": "262",
        "name": "Mayotte"
    },
    {
        "code": "MX",
        "callingCode": "52",
        "name": "Mexico"
    },
    {
        "code": "FM",
        "callingCode": "691",
        "name": "Micronesia"
    },
    {
        "code": "MD",
        "callingCode": "373",
        "name": "Moldova"
    },
    {
        "code": "MC",
        "callingCode": "377",
        "name": "Monaco"
    },
    {
        "code": "MN",
        "callingCode": "976",
        "name": "Mongolia"
    },
    {
        "code": "ME",
        "callingCode": "382",
        "name": "Montenegro"
    },
    {
        "code": "MS",
        "callingCode": "1",
        "name": "Montserrat"
    },
    {
        "code": "MA",
        "callingCode": "212",
        "name": "Morocco"
    },
    {
        "code": "MZ",
        "callingCode": "258",
        "name": "Mozambique"
    },
    {
        "code": "MM",
        "callingCode": "95",
        "name": "Myanmar (Burma)"
    },
    {
        "code": "NA",
        "callingCode": "264",
        "name": "Namibia"
    },
    {
        "code": "NR",
        "callingCode": "674",
        "name": "Nauru"
    },
    {
        "code": "NP",
        "callingCode": "977",
        "name": "Nepal"
    },
    {
        "code": "NL",
        "callingCode": "31",
        "name": "Netherlands"
    },
    {
        "code": "NC",
        "callingCode": "687",
        "name": "New Caledonia"
    },
    {
        "code": "NZ",
        "callingCode": "64",
        "name": "New Zealand"
    },
    {
        "code": "NI",
        "callingCode": "505",
        "name": "Nicaragua"
    },
    {
        "code": "NE",
        "callingCode": "227",
        "name": "Niger"
    },
    {
        "code": "NG",
        "callingCode": "234",
        "name": "Nigeria"
    },
    {
        "code": "NU",
        "callingCode": "683",
        "name": "Niue"
    },
    {
        "code": "NF",
        "callingCode": "672",
        "name": "Norfolk Island"
    },
    {
        "code": "KP",
        "callingCode": "850",
        "name": "North Korea"
    },
    {
        "code": "MK",
        "callingCode": "389",
        "name": "North Macedonia"
    },
    {
        "code": "MP",
        "callingCode": "1",
        "name": "Northern Mariana Islands"
    },
    {
        "code": "NO",
        "callingCode": "47",
        "name": "Norway"
    },
    {
        "code": "OM",
        "callingCode": "968",
        "name": "Oman"
    },
    {
        "code": "PK",
        "callingCode": "92",
        "name": "Pakistan"
    },
    {
        "code": "PW",
        "callingCode": "680",
        "name": "Palau"
    },
    {
        "code": "PS",
        "callingCode": "970",
        "name": "Palestinian Territories"
    },
    {
        "code": "PA",
        "callingCode": "507",
        "name": "Panama"
    },
    {
        "code": "PG",
        "callingCode": "675",
        "name": "Papua New Guinea"
    },
    {
        "code": "PY",
        "callingCode": "595",
        "name": "Paraguay"
    },
    {
        "code": "PE",
        "callingCode": "51",
        "name": "Peru"
    },
    {
        "code": "PH",
        "callingCode": "63",
        "name": "Philippines"
    },
    {
        "code": "PL",
        "callingCode": "48",
        "name": "Poland"
    },
    {
        "code": "PT",
        "callingCode": "351",
        "name": "Portugal"
    },
    {
        "code": "PR",
        "callingCode": "1",
        "name": "Puerto Rico"
    },
    {
        "code": "QA",
        "callingCode": "974",
        "name": "Qatar"
    },
    {
        "code": "RE",
        "callingCode": "262",
        "name": "Réunion"
    },
    {
        "code": "RO",
        "callingCode": "40",
        "name": "Romania"
    },
    {
        "code": "RU",
        "callingCode": "7",
        "name": "Russia"
    },
    {
        "code": "RW",
        "callingCode": "250",
        "name": "Rwanda"
    },
    {
        "code": "WS",
        "callingCode": "685",
        "name": "Samoa"
    },
    {
        "code": "SM",
        "callingCode": "378",
        "name": "San Marino"
    },
    {
        "code": "ST",
        "callingCode": "239",
        "name": "São Tomé & Príncipe"
    },
    {
        "code": "SA",
        "callingCode": "966",
        "name": "Saudi Arabia"
    },
    {
        "code": "SN",
        "callingCode": "221",
        "name": "Senegal"
    },
    {
        "code": "RS",
        "callingCode": "381",
        "name": "Serbia"
    },
    {
        "code": "SC",
        "callingCode": "248",
        "name": "Seychelles"
    },
    {
        "code": "SL",
        "callingCode": "232",
        "name": "Sierra Leone"
    },
    {
        "code": "SG",
        "callingCode": "65",
        "name": "Singapore"
    },
    {
        "code": "SX",
        "callingCode": "1",
        "name": "Sint Maarten"
    },
    {
        "code": "SK",
        "callingCode": "421",
        "name": "Slovakia"
    },
    {
        "code": "SI",
        "callingCode": "386",
        "name": "Slovenia"
    },
    {
        "code": "SB",
        "callingCode": "677",
        "name": "Solomon Islands"
    },
    {
        "code": "SO",
        "callingCode": "252",
        "name": "Somalia"
    },
    {
        "code": "ZA",
        "callingCode": "27",
        "name": "South Africa"
    },
    {
        "code": "KR",
        "callingCode": "82",
        "name": "South Korea"
    },
    {
        "code": "SS",
        "callingCode": "211",
        "name": "South Sudan"
    },
    {
        "code": "ES",
        "callingCode": "34",
        "name": "Spain"
    },
    {
        "code": "LK",
        "callingCode": "94",
        "name": "Sri Lanka"
    },
    {
        "code": "BL",
        "callingCode": "590",
        "name": "St. Barthélemy"
    },
    {
        "code": "SH",
        "callingCode": "290",
        "name": "St. Helena"
    },
    {
        "code": "KN",
        "callingCode": "1",
        "name": "St. Kitts & Nevis"
    },
    {
        "code": "LC",
        "callingCode": "1",
        "name": "St. Lucia"
    },
    {
        "code": "MF",
        "callingCode": "590",
        "name": "St. Martin"
    },
    {
        "code": "PM",
        "callingCode": "508",
        "name": "St. Pierre & Miquelon"
    },
    {
        "code": "VC",
        "callingCode": "1",
        "name": "St. Vincent & Grenadines"
    },
    {
        "code": "SD",
        "callingCode": "249",
        "name": "Sudan"
    },
    {
        "code": "SR",
        "callingCode": "597",
        "name": "Suriname"
    },
    {
        "code": "SJ",
        "callingCode": "47",
        "name": "Svalbard & Jan Mayen"
    },
    {
        "code": "SE",
        "callingCode": "46",
        "name": "Sweden"
    },
    {
        "code": "CH",
        "callingCode": "41",
        "name": "Switzerland"
    },
    {
        "code": "SY",
        "callingCode": "963",
        "name": "Syria"
    },
    {
        "code": "TW",
        "callingCode": "886",
        "name": "Taiwan"
    },
    {
        "code": "TJ",
        "callingCode": "992",
        "name": "Tajikistan"
    },
    {
        "code": "TZ",
        "callingCode": "255",
        "name": "Tanzania"
    },
    {
        "code": "TH",
        "callingCode": "66",
        "name": "Thailand"
    },
    {
        "code": "TL",
        "callingCode": "670",
        "name": "Timor-Leste"
    },
    {
        "code": "TG",
        "callingCode": "228",
        "name": "Togo"
    },
    {
        "code": "TK",
        "callingCode": "690",
        "name": "Tokelau"
    },
    {
        "code": "TO",
        "callingCode": "676",
        "name": "Tonga"
    },
    {
        "code": "TT",
        "callingCode": "1",
        "name": "Trinidad & Tobago"
    },
    {
        "code": "TA",
        "callingCode": "290",
        "name": "Tristan da Cunha"
    },
    {
        "code": "TN",
        "callingCode": "216",
        "name": "Tunisia"
    },
    {
        "code": "TR",
        "callingCode": "90",
        "name": "Türkiye"
    },
    {
        "code": "TM",
        "callingCode": "993",
        "name": "Turkmenistan"
    },
    {
        "code": "TC",
        "callingCode": "1",
        "name": "Turks & Caicos Islands"
    },
    {
        "code": "TV",
        "callingCode": "688",
        "name": "Tuvalu"
    },
    {
        "code": "VI",
        "callingCode": "1",
        "name": "U.S. Virgin Islands"
    },
    {
        "code": "UG",
        "callingCode": "256",
        "name": "Uganda"
    },
    {
        "code": "UA",
        "callingCode": "380",
        "name": "Ukraine"
    },
    {
        "code": "AE",
        "callingCode": "971",
        "name": "United Arab Emirates"
    },
    {
        "code": "GB",
        "callingCode": "44",
        "name": "United Kingdom"
    },
    {
        "code": "US",
        "callingCode": "1",
        "name": "United States"
    },
    {
        "code": "UY",
        "callingCode": "598",
        "name": "Uruguay"
    },
    {
        "code": "UZ",
        "callingCode": "998",
        "name": "Uzbekistan"
    },
    {
        "code": "VU",
        "callingCode": "678",
        "name": "Vanuatu"
    },
    {
        "code": "VA",
        "callingCode": "39",
        "name": "Vatican City"
    },
    {
        "code": "VE",
        "callingCode": "58",
        "name": "Venezuela"
    },
    {
        "code": "VN",
        "callingCode": "84",
        "name": "Vietnam"
    },
    {
        "code": "WF",
        "callingCode": "681",
        "name": "Wallis & Futuna"
    },
    {
        "code": "EH",
        "callingCode": "212",
        "name": "Western Sahara"
    },
    {
        "code": "YE",
        "callingCode": "967",
        "name": "Yemen"
    },
    {
        "code": "ZM",
        "callingCode": "260",
        "name": "Zambia"
    },
    {
        "code": "ZW",
        "callingCode": "263",
        "name": "Zimbabwe"
    }
];
