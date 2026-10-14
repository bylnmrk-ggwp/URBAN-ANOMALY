export type PreviewDevice = 'mobile' | 'tablet' | 'desktop'

/** Iframe widths per device; desktop fills the preview area. */
export const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  mobile: '390px',
  tablet: '768px',
  desktop: '100%',
}
