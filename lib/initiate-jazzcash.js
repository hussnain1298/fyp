export default async function handler(req, res) {
  if (req.method === "POST") {
    // In a real case, you'd prepare a secure JazzCash redirect URL here
    const mockUrl = "https://careconnect.pk/payment-success?gateway=jazzcash";
    res.status(200).json({ url: mockUrl });
  } else {
    res.status(405).end();
  }
}
