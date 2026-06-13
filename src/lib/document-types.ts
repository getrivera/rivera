export const DOCUMENT_TYPES = [
    'Certificate of Occupancy (C of O)',
    'Deed of Assignment',
    'Survey Plan',
    'Letter of Allocation',
    'Gazette',
    'Other',
  ] as const
  
  export type DocumentType = typeof DOCUMENT_TYPES[number]