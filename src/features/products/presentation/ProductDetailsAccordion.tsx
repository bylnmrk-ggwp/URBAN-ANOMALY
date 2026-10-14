import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { Product } from '@/features/products/domain/entities'

interface ProductDetailsAccordionProps {
  product: Pick<Product, 'details' | 'description'>
}

export function ProductDetailsAccordion({ product }: ProductDetailsAccordionProps) {
  return (
    <Accordion type="multiple" defaultValue={['details']} className="border-t">
      <AccordionItem value="details">
        <AccordionTrigger className="text-base">Details</AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-relaxed">
          <p>{product.description}</p>
          {product.details.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="shipping">
        <AccordionTrigger className="text-base">Shipping &amp; returns</AccordionTrigger>
        <AccordionContent className="text-muted-foreground space-y-2 leading-relaxed">
          <p>
            Free shipping on orders over ₱2,500; a flat ₱150 fee applies otherwise. Metro Manila
            orders arrive in 2–3 business days, provincial orders in 5–7.
          </p>
          <p>
            Unworn items with tags can be returned within 14 days of delivery for an exchange or
            refund.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="care">
        <AccordionTrigger className="text-base">Care</AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-relaxed">
          <p>
            Machine wash cold with like colours. Tumble dry low or hang to dry. Iron on low if
            needed and avoid bleach to keep colours true.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
