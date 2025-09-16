import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { password } = req.body;
  const CORRECT_PASSWORD = process.env.SP_KEY;

  if (password === CORRECT_PASSWORD) {
    const cookie = serialize('authenticated', 'true', {
      path: '/',
      httpOnly: true,
      secure: true, // This is the key change for Vercel
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // Cookie valid for 24 hours
    });

    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Invalid password' });
}