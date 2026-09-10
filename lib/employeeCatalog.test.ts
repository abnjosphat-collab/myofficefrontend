import { describe, it, expect } from 'vitest';
import {
  normalizeDesignation,
  isStandardDesignation,
  designationSelectOptions,
  buildForemanOptions,
  normalizeDriverLicense,
  resolveDriverLicense,
  isLegacyClass4DriverDesignation,
  sectionForDesignation,
  resolveDesignation,
  normalizeEmployeeRoleFields,
  isArtisanClass1Designation,
  isForemanDesignation,
  rosterSubgroupLabel,
  isHoistDriverDesignation,
  shouldArchiveEmployee,
  ARTISAN_FILTER_VALUE,
  ARTISAN_SUBCATEGORY,
  FOREMAN_SUBCATEGORY,
  DESIGNATION_ORDER,
} from './employeeCatalog';

describe('normalizeDesignation', () => {
  it('canonicalizes exact matches case-insensitively', () => {
    expect(normalizeDesignation('fitter class 1')).toBe('Fitter Class 1');
    expect(normalizeDesignation('WINDER TECHNICIAN ELECTRICAL')).toBe('Winder Technician Electrical');
  });
  it('reorders "Class N Trade" to "Trade Class N"', () => {
    expect(normalizeDesignation('Class 1 Electrician')).toBe('Electrician Class 1');
    expect(normalizeDesignation('Class 2 Fitter')).toBe('Fitter Class 2');
  });
  it('maps legacy Class 4 Driver job titles to Light Vehicle Driver', () => {
    expect(normalizeDesignation('Class 4 Driver')).toBe('Light Vehicle Driver');
    expect(normalizeDesignation('Driver Class 4')).toBe('Light Vehicle Driver');
    expect(normalizeDesignation('Driver')).toBe('Light Vehicle Driver');
    expect(normalizeDesignation('class 4')).toBe('Light Vehicle Driver');
    expect(normalizeDesignation('Class IV Driver')).toBe('Light Vehicle Driver');
  });
  it('does not remap trade designations that mention class numbers', () => {
    expect(normalizeDesignation('Fitter Class 4')).toBe('Fitter Class 4');
    expect(normalizeDesignation('Mechanical Winder Technician')).toBe('Winder Technician Mechanical');
  });
  it('maps common legacy aliases', () => {
    expect(normalizeDesignation('electrician')).toBe('Electrician Class 1');
    expect(normalizeDesignation('Boilermaker')).toBe('Boilermaker Semi Skilled');
    expect(normalizeDesignation('boilermaker semi skilled')).toBe('Boilermaker Semi Skilled');
    expect(normalizeDesignation('Rigger assistent')).toBe('Rigger Assistant');
    expect(normalizeDesignation('inder technician Mechanical')).toBe('Winder Technician Mechanical');
    expect(normalizeDesignation('Assistant Fitter')).toBe('Fitter Assistant');
    expect(normalizeDesignation("Fitter's Assistant")).toBe('Fitter Assistant');
    expect(normalizeDesignation('Assistant fitter')).toBe('Fitter Assistant');
    expect(normalizeDesignation('Electrical Winder Tech')).toBe('Winder Technician Electrical');
    expect(normalizeDesignation('winder tech assist')).toBe('winder tech assist');
    expect(normalizeDesignation('Lamproom Atendant')).toBe('Lamproom Attendant');
  });
  it('returns trimmed original when no mapping exists', () => {
    expect(normalizeDesignation('  Graduate Trainee  ')).toBe('Graduate Trainee');
  });
});

describe('isStandardDesignation', () => {
  it('recognizes canonical designations', () => {
    expect(isStandardDesignation('Boilermaker Class 2')).toBe(true);
    expect(isStandardDesignation('Boilermaker Semi Skilled')).toBe(true);
    expect(isStandardDesignation('Light Vehicle Driver')).toBe(true);
    expect(isStandardDesignation('Graduate Trainee')).toBe(false);
  });
});

describe('designationSelectOptions', () => {
  it('includes all standard roles plus placeholder', () => {
    const opts = designationSelectOptions();
    expect(opts[0].value).toBe('');
    expect(opts.some(o => o.value === 'Rigger Class 1')).toBe(true);
    expect(opts.some(o => o.value === 'Light Vehicle Driver')).toBe(true);
    expect(opts.some(o => o.value === 'Bus Driver')).toBe(true);
    expect(opts.length).toBe(DESIGNATION_ORDER.length + 1);
  });
  it('prepends legacy value when editing a non-standard role', () => {
    const opts = designationSelectOptions('Graduate Trainee');
    expect(opts[1].value).toBe('Graduate Trainee');
    expect(opts[1].label).toContain('legacy');
  });
});

describe('buildForemanOptions', () => {
  it('collects supervisors and foremen by designation', () => {
    const names = buildForemanOptions([
      { first_name: 'John', last_name: 'Doe', designation: 'Foreman', supervisor: '' },
      { first_name: 'Jane', last_name: 'Smith', designation: 'Fitter Class 1', supervisor: 'John Doe' },
    ]);
    expect(names).toContain('John Doe');
    expect(names).not.toContain('Jane Smith');
  });
});

describe('isLegacyClass4DriverDesignation', () => {
  it('recognises driver job-title miscategorisations only', () => {
    expect(isLegacyClass4DriverDesignation('Class 4 Driver')).toBe(true);
    expect(isLegacyClass4DriverDesignation('Driver Class 4')).toBe(true);
    expect(isLegacyClass4DriverDesignation('Fitter Class 4')).toBe(false);
    expect(isLegacyClass4DriverDesignation('Electrician Class 1')).toBe(false);
  });
});

describe('normalizeDriverLicense', () => {
  it('canonicalizes licence dropdown values and typos only', () => {
    expect(normalizeDriverLicense('Light Vehicle Driver')).toBe('Light Vehicle Driver');
    expect(normalizeDriverLicense('Light vehilce driver')).toBe('Light Vehicle Driver');
  });
  it('leaves Class 4 licence notes unchanged', () => {
    expect(normalizeDriverLicense('Class 4')).toBe('Class 4');
    expect(normalizeDriverLicense('Class 4 Driver')).toBe('Class 4 Driver');
    expect(normalizeDriverLicense('Code 10')).toBe('Code 10');
  });
});

describe('resolveDriverLicense', () => {
  it('does not remap designation or licence class notes', () => {
    expect(resolveDriverLicense('Class 4')).toBe('Class 4');
    expect(resolveDriverLicense('Heavy Vehicle Driver')).toBe('Heavy Vehicle Driver');
  });
});

describe('sectionForDesignation', () => {
  it('maps electrical trades to Electrical and mechanical trades to Mechanical', () => {
    expect(sectionForDesignation('Electrician Class 1')).toBe('Electrical');
    expect(sectionForDesignation('electrician')).toBe('Electrical');
    expect(sectionForDesignation('Fitter Class 1')).toBe('Mechanical');
    expect(sectionForDesignation('Lamproom Attendant')).toBe('Electrical');
    expect(sectionForDesignation('Maintenance Engineer')).toBe('Management');
    expect(sectionForDesignation('Engineering Manager')).toBe('Management');
    expect(sectionForDesignation('Foreman')).toBeNull();
    expect(sectionForDesignation('Light Vehicle Driver')).toBeNull();
  });
});

describe('normalizeEmployeeRoleFields', () => {
  it('fixes mismatched section for an electrician on Mechanical', () => {
    const r = normalizeEmployeeRoleFields('Electrician', 'Mechanical');
    expect(r.designation).toBe('Electrician Class 1');
    expect(r.section).toBe('Electrical');
  });
  it('places maintenance engineers in Management', () => {
    const r = normalizeEmployeeRoleFields('Maintenance Engineer', '', 'Edson', 'Mavhondo');
    expect(r.designation).toBe('Maintenance Engineer');
    expect(r.section).toBe('Management');
  });
  it('applies known roster corrections by employee name', () => {
    expect(resolveDesignation('Mechanical Winder Technician', 'Givemore', 'Zaronga')).toBe('Winder Technician Mechanical');
    expect(resolveDesignation('Hoist Technician Assistant', 'Manias', 'Mutova')).toBe('Fitter Class 2');
    expect(resolveDesignation('Class 4 Driver', 'Sibanengi', 'Bafanato')).toBe('Light Vehicle Driver');
    expect(resolveDesignation('Driver', 'Sibanengi', 'Bafana')).toBe('Light Vehicle Driver');
    expect(resolveDesignation('Driver Class 4', 'Andrew', 'Maendaenda')).toBe('Light Vehicle Driver');
    expect(resolveDesignation('Driver Class 4', 'Raymond', 'Kaseke')).toBe('Light Vehicle Driver');
    expect(resolveDesignation('Stores Driver', 'Philip', 'Antonio')).toBe('Light Vehicle Driver');
    expect(resolveDesignation('Hoist Technician', 'Malven', 'Midizi')).toBe('Winder Technician Electrical');
    expect(resolveDesignation('Hoist Technician', 'Malven', 'Midzi')).toBe('Winder Technician Electrical');
    expect(resolveDesignation('Hoist Technician', 'Malven ', 'Midzi')).toBe('Winder Technician Electrical');
    expect(resolveDesignation('Winder Tech', 'Malvin', 'Midizi')).toBe('Winder Technician Electrical');
    expect(resolveDesignation('Boilermaker', 'Maxwell', 'Chitumbi')).toBe('Boilermaker Semi Skilled');
    expect(resolveDesignation('Boilermaker', 'Maxwell ', 'Chitumbi')).toBe('Boilermaker Semi Skilled');
  });
});

describe('artisan and foreman subgrouping', () => {
  it('groups Class 1 trades and winder techs under Artisan', () => {
    expect(isArtisanClass1Designation('Fitter Class 1')).toBe(true);
    expect(isArtisanClass1Designation('Electrician Class 1')).toBe(true);
    expect(isArtisanClass1Designation('Winder Technician Electrical')).toBe(true);
    expect(isArtisanClass1Designation('Winder Technician Mechanical')).toBe(true);
    expect(isArtisanClass1Designation('Fitter Class 2')).toBe(false);
    expect(rosterSubgroupLabel('Boilermaker Class 1')).toBe(ARTISAN_SUBCATEGORY);
    expect(rosterSubgroupLabel('Winder Technician Electrical')).toBe(ARTISAN_SUBCATEGORY);
  });
  it('groups Foreman and Supervisor under Foremen', () => {
    expect(isForemanDesignation('Foreman')).toBe(true);
    expect(isForemanDesignation('Supervisor')).toBe(true);
    expect(isForemanDesignation('Fitter Class 1')).toBe(false);
    expect(rosterSubgroupLabel('Foreman')).toBe(FOREMAN_SUBCATEGORY);
    expect(rosterSubgroupLabel('Supervisor')).toBe(FOREMAN_SUBCATEGORY);
  });
});

describe('hoist driver archive', () => {
  it('archives Hoist Driver but not Hoist Technician', () => {
    expect(isHoistDriverDesignation('Hoist Driver')).toBe(true);
    expect(isHoistDriverDesignation('Hoist Technician')).toBe(false);
    expect(shouldArchiveEmployee('Hoist Driver', false)).toBe(true);
    expect(shouldArchiveEmployee('Hoist Technician', false)).toBe(false);
  });
});
