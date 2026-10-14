export interface Category {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string | null
  sortOrder: number
  productCount: number
  /** Collection page intro. Empty strings mean "use the name / no body". */
  introTitle: string
  /** Restricted Markdown, rendered under the description on the collection page. */
  introBody: string
}

export interface CategoryInput {
  name: string
  slug: string
  description: string
  imageUrl: string | null
  introTitle: string
  introBody: string
}
