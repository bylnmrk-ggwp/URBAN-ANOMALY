import type { AppNotification } from '@/features/notifications/domain/entities'

import { SEED_ORDERS } from './orders'
import { daysAgo } from './products'

function orderNumberOf(orderId: string): string {
  const order = SEED_ORDERS.find((o) => o.id === orderId)
  if (!order) throw new Error(`Seed notification references unknown order ${orderId}`)
  return order.orderNumber
}

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'ntf-01',
    type: 'new_order',
    title: `New order ${orderNumberOf('ord-18')}`,
    message: 'Miguel Bautista placed an online order for 1 pair (awaiting payment).',
    href: '/admin/orders/ord-18',
    isRead: false,
    createdAt: daysAgo(0, 3),
  },
  {
    id: 'ntf-02',
    type: 'new_order',
    title: `New order ${orderNumberOf('ord-17')}`,
    message: 'Maria Santos placed a COD order for 2 items.',
    href: '/admin/orders/ord-17',
    isRead: false,
    createdAt: daysAgo(1, 4),
  },
  {
    id: 'ntf-03',
    type: 'low_stock',
    title: 'Low stock: Platform Clog',
    message: 'PLACLO-MID-10 has 3 pairs available, below the threshold of 5.',
    href: '/admin/inventory',
    isRead: false,
    createdAt: daysAgo(1, 9),
  },
  {
    id: 'ntf-04',
    type: 'payment_confirmed',
    title: `Payment received for ${orderNumberOf('ord-16')}`,
    message: 'Online payment of PHP 1,740.00 confirmed for Christine Tan.',
    href: '/admin/orders/ord-16',
    isRead: true,
    createdAt: daysAgo(2, 1),
  },
  {
    id: 'ntf-05',
    type: 'order_issue',
    title: `Delivery attempt failed for ${orderNumberOf('ord-11')}`,
    message: 'J&T Express reported no one available at the address. Second attempt scheduled.',
    href: '/admin/orders/ord-11',
    isRead: false,
    createdAt: daysAgo(2, 6),
  },
  {
    id: 'ntf-06',
    type: 'new_order',
    title: `New order ${orderNumberOf('ord-15')}`,
    message: 'Paolo Villanueva placed a COD order for 2 items.',
    href: '/admin/orders/ord-15',
    isRead: true,
    createdAt: daysAgo(3, 2),
  },
  {
    id: 'ntf-07',
    type: 'low_stock',
    title: 'Out of stock: Lava Premium Clog',
    message: 'LAVPRE-LAV-6 is sold out. Consider restocking before the weekend.',
    href: '/admin/inventory',
    isRead: true,
    createdAt: daysAgo(4, 5),
  },
  {
    id: 'ntf-08',
    type: 'payment_confirmed',
    title: `Payment received for ${orderNumberOf('ord-14')}`,
    message: 'Online payment of PHP 2,040.00 confirmed for Maria Santos.',
    href: '/admin/orders/ord-14',
    isRead: true,
    createdAt: daysAgo(4, 8),
  },
]
