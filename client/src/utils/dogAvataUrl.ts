export default async function getDogAvatarUrl() {
  const res = await fetch('https://dog.ceo/api/breeds/image/random')
  const data = await res.json();
  if(data.status !== 'success') {
    throw new Error(`请求狗头像失败，状态码：${res.status}`);
  }
  return data.message;
}