/**
 * NW Touring & Concierge - Transportation Terms & Conditions
 *
 * These terms apply to all transportation services provided by:
 * - NW Touring & Concierge LLC (Oregon)
 * - Herding Cats Wine Tours (DBA)
 *
 * USDOT: 3603851 | MC: 1225087
 */

export interface LiabilitySection {
  id: string;
  number: string;
  title: string;
  content: string;
  subsections?: {
    id: string;
    label: string;
    content: string;
  }[];
}

export interface VehicleDamagePolicy {
  type: string;
  description: string;
  fee: number;
  notes?: string;
}

export const NW_TOURING_COMPANY_INFO = {
  legalName: 'NW Touring & Concierge LLC',
  displayName: 'NW Touring & Concierge',
  dbaNames: ['Herding Cats Wine Tours'],
  stateOfFormation: 'OR',
  usdot: '3603851',
  mc: '1225087',
  insuranceMinimum: 1500000,
  email: 'info@nwtouring.com',
  phone: '509-200-8000',
  address: {
    city: 'Milton-Freewater',
    state: 'OR',
  },
};

export const VEHICLE_DAMAGE_FEES: VehicleDamagePolicy[] = [
  {
    type: 'cleaning',
    description: 'Professional cleaning required beyond normal use (spilled wine/food, excessive dirt)',
    fee: 300,
  },
  {
    type: 'vomit',
    description: 'Biohazard cleaning (vomit, bodily fluids)',
    fee: 300,
  },
  {
    type: 'smoking',
    description: 'Smoking or vaping in vehicle (cleaning/deodorizing)',
    fee: 300,
  },
  {
    type: 'illegal_activity',
    description: 'Damage from illegal activity (plus actual repair costs)',
    fee: 500,
    notes: 'Base incident fee; actual damage costs charged separately',
  },
  {
    type: 'minor_damage',
    description: 'Minor damage to vehicle interior',
    fee: 250,
    notes: 'Or actual repair cost if higher',
  },
  {
    type: 'major_damage',
    description: 'Major damage requiring professional repair',
    fee: 0,
    notes: 'Charged at actual repair/replacement cost',
  },
];

export const NW_TOURING_LIABILITY_SECTIONS: LiabilitySection[] = [
  {
    id: 'nature_of_services',
    number: '6.1',
    title: 'Nature of Services',
    content: 'NW Touring & Concierge provides wine tour transportation services in the Walla Walla Valley, Columbia Valley, and surrounding regions. Our tours involve travel by motor vehicle, visits to wineries and restaurants, and may include consumption of alcoholic beverages.',
  },
  {
    id: 'assumption_of_risk',
    number: '6.2',
    title: 'Assumption of Risk',
    content: 'By booking a tour, you acknowledge and voluntarily accept the inherent risks associated with:',
    subsections: [
      { id: 'risk_travel', label: 'Motor vehicle travel', content: 'Travel on public and private roads in varying conditions' },
      { id: 'risk_alcohol', label: 'Alcohol consumption', content: 'Consumption of alcoholic beverages and its effects on judgment and coordination' },
      { id: 'risk_terrain', label: 'Walking on uneven terrain', content: 'Walking on uneven terrain at wineries and venues' },
      { id: 'risk_weather', label: 'Weather conditions', content: 'Weather conditions including heat, cold, rain, or wind' },
      { id: 'risk_allergies', label: 'Allergic reactions', content: 'Allergic reactions to food, wine, or environmental factors' },
      { id: 'risk_interaction', label: 'Third-party interaction', content: 'Interaction with other guests and third parties' },
    ],
  },
  {
    id: 'alcohol_consumption',
    number: '6.3',
    title: 'Alcohol Consumption',
    content: 'All guests consuming alcohol must be at least 21 years of age. Guests assume full responsibility for their alcohol consumption and any resulting effects. NW Touring & Concierge reserves the right to refuse service or end a tour early if any guest\'s behavior becomes unsafe, disruptive, or jeopardizes the safety of others. No refund will be provided for tours terminated due to guest conduct.',
  },
  {
    id: 'health_fitness',
    number: '6.4',
    title: 'Health & Fitness',
    content: 'Guests should be in reasonably good health and able to participate in light walking activities. If you have medical conditions that may affect your participation, please inform us before your tour. In case of medical emergency, you authorize NW Touring & Concierge to arrange emergency medical transportation and treatment at your expense.',
  },
  {
    id: 'release_of_liability',
    number: '6.5',
    title: 'Release of Liability',
    content: 'To the maximum extent permitted by law, you release and discharge NW Touring & Concierge LLC, its owners, employees, drivers, and affiliates from any claims, demands, or causes of action arising from your participation in the tour, except in cases of gross negligence or willful misconduct by NW Touring & Concierge.',
  },
  {
    id: 'third_party_services',
    number: '6.6',
    title: 'Third-Party Services',
    content: 'Wineries, restaurants, and other venues visited during your tour are independent businesses. NW Touring & Concierge is not liable for their services, products, policies, or the actions of their staff. Tasting fees paid to wineries are separate transactions between you and the winery.',
  },
  {
    id: 'personal_property',
    number: '6.7',
    title: 'Personal Property',
    content: 'NW Touring & Concierge is not responsible for lost, stolen, or damaged personal belongings. Please keep valuables secure and with you at all times.',
  },
  {
    id: 'indemnification',
    number: '6.8',
    title: 'Indemnification',
    content: 'You agree to indemnify and hold harmless NW Touring & Concierge LLC from any claims, damages, or expenses (including reasonable attorney fees) arising from your actions or omissions during the tour, including but not limited to injuries caused to yourself or others.',
  },
  {
    id: 'insurance',
    number: '6.9',
    title: 'Insurance',
    content: 'NW Touring & Concierge maintains commercial liability insurance as required by federal regulations for passenger motor carriers (minimum $1,500,000 for vehicles carrying 15 or fewer passengers, per FMCSA 49 CFR 387). This coverage provides protection in cases of vehicle accidents. This coverage does not extend to your personal property or elective medical expenses.',
  },
  {
    id: 'photo_video_release',
    number: '6.10',
    title: 'Photo & Video Release',
    content: 'Unless you notify us otherwise before your tour begins, you consent to NW Touring & Concierge using photographs or videos taken during your tour for marketing and promotional purposes without compensation. If you prefer not to be photographed, please inform your driver at the start of the tour.',
  },
  {
    id: 'force_majeure',
    number: '6.11',
    title: 'Force Majeure',
    content: 'NW Touring & Concierge is not liable for delays, cancellations, or modifications caused by circumstances beyond our control, including but not limited to: severe weather, natural disasters, government actions, road closures, winery closures, public health emergencies, or other acts of God.',
  },
  {
    id: 'governing_law',
    number: '6.12',
    title: 'Governing Law',
    content: 'NW Touring & Concierge LLC is an Oregon limited liability company. These transportation terms are governed by the laws of the State of Oregon. For tours conducted in Washington State, applicable Washington consumer protection laws shall also apply to the extent required by law. Any legal disputes shall be resolved in the courts of Umatilla County, Oregon.',
  },
  {
    id: 'vehicle_care',
    number: '6.13',
    title: 'Vehicle Care & Damage',
    content: 'Guests are responsible for treating our vehicles with care. You agree to the following terms regarding vehicle condition:',
    subsections: [
      {
        id: 'cleaning_fee',
        label: 'Cleaning Fee',
        content: 'A cleaning fee of up to $300 will be charged to the card on file for messes requiring professional cleaning beyond normal use, including but not limited to: vomit, spilled wine or food, excessive dirt, or other substances requiring specialized cleaning services.',
      },
      {
        id: 'property_damage',
        label: 'Property Damage',
        content: 'You are responsible for the cost of repairing or replacing any vehicle components damaged by your party during the tour, including but not limited to: upholstery, windows, electronics, safety equipment, or exterior damage. Repair costs will be assessed at actual repair or replacement value.',
      },
      {
        id: 'smoking_vaping',
        label: 'Smoking/Vaping Prohibited',
        content: 'Smoking and vaping are prohibited in all vehicles. Violation will result in a $300 cleaning/deodorizing fee.',
      },
      {
        id: 'illegal_activity',
        label: 'Illegal Activity',
        content: 'Any damage resulting from illegal activity (including drug use) will be charged at full repair cost plus a $500 incident fee, and may result in immediate tour termination without refund.',
      },
    ],
  },
  {
    id: 'electronic_signature',
    number: '6.14',
    title: 'Electronic Signature & Acceptance',
    content: 'By completing a booking, you acknowledge that you have read, understand, and agree to these Transportation Terms and Conditions. Your electronic acceptance (clicking "I Agree" or similar) or deposit payment constitutes your legal signature and agreement to be bound by these terms.',
  },
];

export const NW_TOURING_TERMS = {
  version: '1.0',
  lastUpdated: '2025-12-25',
  company: NW_TOURING_COMPANY_INFO,
  sections: NW_TOURING_LIABILITY_SECTIONS,
  vehicleDamageFees: VEHICLE_DAMAGE_FEES,
};

/**
 * Get a specific liability section by ID
 */
export function getLiabilitySection(sectionId: string): LiabilitySection | undefined {
  return NW_TOURING_LIABILITY_SECTIONS.find(s => s.id === sectionId);
}

/**
 * Get all liability sections as formatted text
 */
export function getLiabilitySectionsText(): string {
  return NW_TOURING_LIABILITY_SECTIONS.map(section => {
    let text = `${section.number} ${section.title}\n${section.content}`;
    if (section.subsections) {
      text += '\n' + section.subsections.map(sub => `  - ${sub.label}: ${sub.content}`).join('\n');
    }
    return text;
  }).join('\n\n');
}

/**
 * Get vehicle damage fee by type
 */
export function getVehicleDamageFee(type: string): VehicleDamagePolicy | undefined {
  return VEHICLE_DAMAGE_FEES.find(f => f.type === type);
}

/**
 * Get summary of key liability points for quick display
 */
export function getLiabilitySummary(): string[] {
  return [
    'Guests assume responsibility for risks associated with wine tour activities including alcohol consumption',
    'All alcohol consumers must be 21+ years of age',
    'Vehicle cleaning fee up to $300 for excessive messes',
    'Smoking/vaping prohibited in vehicles ($300 fee)',
    'Guests responsible for any damage to vehicle',
    'Personal property is not covered',
    '$1,500,000 commercial liability insurance maintained per FMCSA requirements',
    'Tours may be terminated without refund for unsafe guest behavior',
  ];
}

/**
 * Get the company name to display based on brand
 */
export function getNWTouringDisplayName(brand?: string): string {
  if (brand && NW_TOURING_COMPANY_INFO.dbaNames.includes(brand)) {
    return brand;
  }
  return NW_TOURING_COMPANY_INFO.displayName;
}
