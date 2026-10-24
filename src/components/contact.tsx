// Set NEXT_PUBLIC_CONTACT_PHONE and/or NEXT_PUBLIC_CONTACT_EMAIL in .env.local so clients
// who can't change a booking online know how to reach the spa.
const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

/** "call us on …", "email us at …", or a plain fallback when neither is configured. */
export function ContactUs() {
  if (phone) {
    return (
      <>
        call us on <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="link">{phone}</a>
      </>
    );
  }
  if (email) {
    return (
      <>
        email us at <a href={`mailto:${email}`} className="link">{email}</a>
      </>
    );
  }
  return <>get in touch with the clinic</>;
}
