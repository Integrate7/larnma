import { createInMemoryRepository } from './inMemoryRepository'
import type { IRepository } from './types'

let instance: IRepository | null = null

export function getRepository(): IRepository {
  if (!instance) instance = createInMemoryRepository()
  return instance
}

export function __setRepository(next: IRepository) {
  instance = next
}

export type { IRepository } from './types'
export { createInMemoryRepository }
