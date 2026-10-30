// app/overtime/engineeringRoster.ts — the ENGINEERING sheet roster of the FY2027
// split-budget workbook (snapshot of the template file). The report covers exactly
// these people in this order; live register data enriches each row where matched.
export interface TemplatePerson {
  code: string;
  firstName: string;
  surname: string;
  occupation: string;
  costCentre: string;
}

export const ENGINEERING_TEMPLATE_ROSTER: TemplatePerson[] = [
  { code: "C0226", firstName: "VALENTINE", surname: "ZHOU", occupation: "LAMP ROOM ATTENDANT", costCentre: "ELECTRICAL" },
  { code: "C0340", firstName: "TENDAI", surname: "KAPENZI", occupation: "ASSITANT ELECTRICAL", costCentre: "ELECTRICAL" },
  { code: "C0353", firstName: "MALVIN", surname: "MAJUTA", occupation: "ELECTRICAL ASSISTANT", costCentre: "ELECTRICAL" },
  { code: "C0393", firstName: "RUKUDZO", surname: "PEDZE", occupation: "LAMP ROOM ATTENDANT", costCentre: "ELECTRICAL" },
  { code: "C0492", firstName: "RODWELL", surname: "MUTERO", occupation: "ELECTRICAL ASSISTANT", costCentre: "ELECTRICAL" },
  { code: "C0688", firstName: "ANDREW", surname: "MAENDAENDA", occupation: "LIGHT VEHICLE DRIVER", costCentre: "ELECTRICAL" },
  { code: "C0717", firstName: "DORICA", surname: "MUKUMBUKENI", occupation: "LAMP ROOM ATTENDANT", costCentre: "ELECTRICAL" },
  { code: "C1069", firstName: "TAWANDA", surname: "KUNZE", occupation: "PUMP ATTENDANT", costCentre: "ELECTRICAL" },
  { code: "C1096", firstName: "JOEL", surname: "SEZI", occupation: "LAMP ROOM ATTENDANT", costCentre: "ELECTRICAL" },
  { code: "C1121", firstName: "JAMESON", surname: "MAPAMBA", occupation: "CLASS 2 ELECTRICIAN", costCentre: "ELECTRICAL" },
  { code: "C1161", firstName: "NEMAI", surname: "NEMAI", occupation: "ELECTRICIAN CLASS 2", costCentre: "ELECTRICAL" },
  { code: "C1189", firstName: "NIGEL", surname: "CHIRENJE", occupation: "ELECTRICIAN CLASS 2", costCentre: "ELECTRICAL" },
  { code: "C1190", firstName: "PERSEVERENCE", surname: "MUKOTO", occupation: "ELECTRICIAN CLASS 2", costCentre: "ELECTRICAL" },
  { code: "C1342", firstName: "SIBANENGI", surname: "BAFANA", occupation: "LIGHT MOTOR VEHICLE DRIVER", costCentre: "ELECTRICAL" },
  { code: "C1420", firstName: "RAYMOND", surname: "KASEKE", occupation: "LIGHT VEHICLE DRIVER", costCentre: "ELECTRICAL" },
  { code: "C1911", firstName: "PRINCE", surname: "MUN'AN'A", occupation: "INTERN ELECTRICAL", costCentre: "ELECTRICAL" },
  { code: "C2038", firstName: "LIBERTY", surname: "PHILI", occupation: "ELECTRICIAN CLASS 2", costCentre: "ELECTRICAL" },
  { code: "C2216", firstName: "TANAKA", surname: "CHIWARA", occupation: "INTERN ELECTRICAL", costCentre: "ELECTRICAL" },
  { code: "C0106", firstName: "WILSON", surname: "CHIPANGURA", occupation: "PUMP ATTENDANT", costCentre: "MECHANICAL" },
  { code: "C0322", firstName: "MAXWELL", surname: "CHITUMBI", occupation: "BOILER MAKER", costCentre: "MECHANICAL" },
  { code: "C0351", firstName: "DAVISON", surname: "YOSEFE", occupation: "BOILERMAKER ASSISTANT", costCentre: "MECHANICAL" },
  { code: "C0355", firstName: "TINOTENDA", surname: "TIGERE", occupation: "FITTER ASSISTANT", costCentre: "MECHANICAL" },
  { code: "C0357", firstName: "PRINCE", surname: "NZUMA", occupation: "BOILERMAKER ASSISTANT", costCentre: "MECHANICAL" },
  { code: "C0379", firstName: "SHEPHERD", surname: "DODZO", occupation: "FITTER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C0394", firstName: "PATRICK", surname: "TOGARA", occupation: "FITTER ASSISTANT", costCentre: "MECHANICAL" },
  { code: "C0819", firstName: "RHINOS", surname: "SANGARA", occupation: "BUS DRIVER", costCentre: "MECHANICAL" },
  { code: "C0928", firstName: "FUNGAYI", surname: "MATUNYA", occupation: "COMPRESSOR ATTENDANT", costCentre: "MECHANICAL" },
  { code: "C0929", firstName: "MANIAS", surname: "MUTOVA", occupation: "FITTER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C0984", firstName: "ALEC", surname: "CHAUYA", occupation: "ASSISTANT RIGGER", costCentre: "MECHANICAL" },
  { code: "C1160", firstName: "EMMANUEL", surname: "SAIKA", occupation: "FITTER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C1165", firstName: "JOSPHAT", surname: "DANDIRA", occupation: "UNDERGROUND MAINTENANCE CLERK", costCentre: "MECHANICAL" },
  { code: "C1184", firstName: "EDMORE", surname: "HANKIE", occupation: "FITTER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C1188", firstName: "ROY", surname: "MAKWANZA", occupation: "FITTER ASSISTANT", costCentre: "MECHANICAL" },
  { code: "C1202", firstName: "FELIX", surname: "CHALEKA", occupation: "LIGHT DUTY DRIVER", costCentre: "MECHANICAL" },
  { code: "C1527", firstName: "TAFADZWA", surname: "MUKOKO", occupation: "COMPRESSOR ATTENDANT", costCentre: "MECHANICAL" },
  { code: "C1748", firstName: "VICTOR", surname: "RUSERE", occupation: "COMPRESSOR ATTENDANT", costCentre: "MECHANICAL" },
  { code: "C1750", firstName: "EMMANUEL", surname: "MPESI", occupation: "PUMP ATTENDANT", costCentre: "MECHANICAL" },
  { code: "C1763", firstName: "HERBET", surname: "NCUBE", occupation: "TRACK BASTER", costCentre: "MECHANICAL" },
  { code: "C1909", firstName: "TINASHE", surname: "MUFAMBI", occupation: "DRIVER CLASS 1", costCentre: "MECHANICAL" },
  { code: "C1910", firstName: "VINCENT", surname: "KONDOWE", occupation: "DRIVER CLASS 1", costCentre: "MECHANICAL" },
  { code: "C2217", firstName: "DIVA", surname: "MBEKISHE", occupation: "FITTER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C2218", firstName: "MOSES", surname: "ZULU", occupation: "FITTER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C2290", firstName: "MATTHEW", surname: "SIMANGO", occupation: "BOILERMAKER CLASS 2", costCentre: "MECHANICAL" },
  { code: "C2291", firstName: "WAILER", surname: "MANZINYA", occupation: "BOILERMAKER CLASS 2", costCentre: "MECHANICAL" },
  { code: "PP058", firstName: "ARTWEL", surname: "CHIDHAKWA", occupation: "PUMP ATTENDANT", costCentre: "MECHANICAL" },
  { code: "PP288", firstName: "PHILLIP", surname: "ANTONIO", occupation: "DRIVER CLASS 2", costCentre: "MECHANICAL" },
  { code: "PP291", firstName: "LWAZI", surname: "DUBE", occupation: "DRIVER CLASS I", costCentre: "MECHANICAL" },
];
