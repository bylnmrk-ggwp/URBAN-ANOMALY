import type { AnnouncementContent, NavigationContent } from '../navigation'
import type { ThemeContent } from '../theme'

export const NAVIGATION_DEFAULT: NavigationContent = {
  primaryLinks: [
    { id: 'nav-home', label: 'Home', href: '/' },
    { id: 'nav-shop', label: 'Shop', href: '/shop' },
  ],
  secondaryLinks: [{ id: 'nav-about', label: 'About', href: '/about' }],
  showCollectionsMenu: true,
  showCategoryColumn: true,
  footerColumns: [
    {
      id: 'footer-help',
      title: 'Help',
      links: [
        { id: 'f-shipping', label: 'Shipping & Returns', href: '/about#shipping' },
        { id: 'f-size', label: 'Size Guide', href: '/about#size-guide' },
        { id: 'f-track', label: 'Track order', href: '/track' },
        { id: 'f-contact', label: 'Contact', href: '/about#contact' },
      ],
    },
    {
      id: 'footer-company',
      title: 'Company',
      links: [
        { id: 'f-about', label: 'About', href: '/about' },
        { id: 'f-careers', label: 'Careers', href: '/about#contact' },
      ],
    },
  ],
  newsletterTitle: 'Newsletter',
  newsletterBody: 'New drops and restocks, once a month. (Demo: signup is not connected.)',
  paymentLine: 'COD · GCash · Cards via PayMongo (coming soon)',
  legalLine: 'All rights reserved.',
}

export const ANNOUNCEMENT_DEFAULT: AnnouncementContent = {
  text: 'Free shipping over ₱2,500 · COD nationwide · New drop every month',
  href: '',
  visible: true,
}

/** Mirrors the :root tokens in src/styles/globals.css. */
export const THEME_DEFAULT: ThemeContent = {
  colors: {
    primary: '#5c7454',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#0f120e',
    muted: '#f1f3ef',
    mutedForeground: '#5a6356',
    border: '#dde2d8',
  },
  fontFamily: 'Inter',
  radius: 'md',
  buttonStyle: 'rounded',
  sectionSpacing: 'default',
}
