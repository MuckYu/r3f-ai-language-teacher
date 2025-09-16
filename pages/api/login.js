import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { password } = req.body;
  const CORRECT_PASSWORD = process.env.SP_KEY; // Use the same password from your .env file

  if (password === CORRECT_PASSWORD) {
    const cookie = serialize('authenticated', 'true', {
      path: '/',
      httpOnly: true, // Crucial for security; prevents client-side access
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production
      sameSite: 'strict', // Protects against CSRF attacks
      maxAge: 60 * 60 // The session lasts for 1 hour
    });

    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Invalid password' });
}