import type { MenuItem } from './types'

export const MENU_CATALOG: MenuItem[] = [
  {
    id: 'kao-phat-gapraw',
    name: 'ข้าวผัดกะเพราไก่',
    price: 85,
    conditionsExcluded: [],
    allergensContained: [],
  },
  {
    id: 'tom-yam-kung',
    name: 'ต้มยำกุ้งน้ำใส',
    price: 120,
    conditionsExcluded: [],
    allergensContained: ['กุ้ง'],
  },
  {
    id: 'khao-tom-moo',
    name: 'ข้าวต้มหมู',
    price: 70,
    conditionsExcluded: [],
    allergensContained: ['หมู'],
  },
  {
    id: 'guay-jub',
    name: 'ก๋วยจั๊บญวน',
    price: 90,
    conditionsExcluded: [],
    allergensContained: [],
  },
  {
    id: 'pla-nueng-manaw',
    name: 'ปลานึ่งมะนาว',
    price: 140,
    conditionsExcluded: [],
    allergensContained: ['ปลา'],
  },
  {
    id: 'kanom-waan',
    name: 'ขนมหวาน',
    price: 45,
    conditionsExcluded: ['เบาหวาน'],
    allergensContained: [],
  },
  {
    id: 'nam-prik-pla-too',
    name: 'น้ำพริกปลาทู ผักสด',
    price: 95,
    conditionsExcluded: [],
    allergensContained: ['ปลา'],
  },
]
