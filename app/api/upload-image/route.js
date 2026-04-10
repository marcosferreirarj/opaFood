import { NextResponse } from 'next/server';

// Endpoint disponível apenas em desenvolvimento.
// A chave IMGBB_API_KEY fica exclusivamente no servidor (sem prefixo NEXT_PUBLIC_),
// portanto nunca é exposta ao browser.

export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'IMGBB_API_KEY not configured' }, { status: 500 });
  }

  const formData = await request.formData();
  const imageFile = formData.get('image');
  const productName = formData.get('name') ?? 'product';

  if (!imageFile || typeof imageFile === 'string') {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  // Envia para o imgbb
  const imgbbForm = new FormData();
  imgbbForm.append('key', apiKey);
  imgbbForm.append('name', productName);
  imgbbForm.append('image', imageFile);

  const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: imgbbForm,
  });

  if (!imgbbRes.ok) {
    const text = await imgbbRes.text();
    console.error('[upload-image] imgbb error:', imgbbRes.status, text);
    return NextResponse.json({ error: 'imgbb upload failed' }, { status: 502 });
  }

  const { data } = await imgbbRes.json();
  return NextResponse.json({ url: data.url });
}
