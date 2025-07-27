export interface IndexMenuType {
  url: string
  icon: string
  title: string
  image?: string
  disabled?: boolean
  children: IndexMenuType[]
}
