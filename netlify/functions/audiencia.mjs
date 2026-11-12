// Guarda o histórico de seguidores (Instagram e YouTube) do Cockpit de Marketing no Netlify Blobs.
// GET    → { historico: [...], protegido }
// POST   → { data: "AAAA-MM-DD", instagram, youtube } cria ou substitui o registro daquela data
// DELETE → ?data=AAAA-MM-DD apaga o registro daquela data
// Senha opcional: defina a variável de ambiente AUDIENCIA_SENHA no Netlify para exigir senha ao editar.
import { getStore } from "@netlify/blobs";

const CHAVE = "historico";
const json = (corpo, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const inteiro = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) && +v >= 0 ? Math.round(+v) : undefined);
const dataValida = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

export default async (req) => {
  const store = getStore({ name: "cockpit-audiencia", consistency: "strong" });
  const senha = (globalThis.Netlify?.env?.get("AUDIENCIA_SENHA") ?? process.env.AUDIENCIA_SENHA) || "";
  const ler = async () => (await store.get(CHAVE, { type: "json" })) || [];

  if (req.method === "GET") return json({ historico: await ler(), protegido: !!senha });

  if (senha && req.headers.get("x-senha") !== senha) return json({ erro: "Senha de edição incorreta." }, 401);

  if (req.method === "POST") {
    let corpo;
    try { corpo = await req.json(); } catch { return json({ erro: "Corpo inválido." }, 400); }
    const instagram = inteiro(corpo.instagram), youtube = inteiro(corpo.youtube);
    if (!dataValida(corpo.data) || instagram === undefined || youtube === undefined || (instagram === null && youtube === null))
      return json({ erro: "Envie a data (AAAA-MM-DD) e ao menos um número de seguidores." }, 400);
    const h = (await ler()).filter(r => r.data !== corpo.data);
    h.push({ data: corpo.data, instagram, youtube, em: new Date().toISOString() });
    h.sort((a, b) => a.data.localeCompare(b.data));
    await store.setJSON(CHAVE, h);
    return json({ historico: h, protegido: !!senha });
  }

  if (req.method === "DELETE") {
    const d = new URL(req.url).searchParams.get("data");
    if (!dataValida(d)) return json({ erro: "Informe ?data=AAAA-MM-DD." }, 400);
    const h = (await ler()).filter(r => r.data !== d);
    await store.setJSON(CHAVE, h);
    return json({ historico: h, protegido: !!senha });
  }

  return json({ erro: "Método não suportado." }, 405);
};
