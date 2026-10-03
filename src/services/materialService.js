import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { inteiro, texto } from '../utils/estoque.mjs';

// Ajuste explícito do cadastro; nunca reescreve documentos de cautelas assinadas.
export async function editarMaterial(db, { materialId, original, dados, uid, operador, motivo }) {
  const quantidade = inteiro(dados.quantidade, 'Disponível');
  const cautelada = inteiro(dados.quantidadeCautelada, 'Cautelado');
  const total = quantidade + cautelada;
  if (!Number.isSafeInteger(total)) throw new Error('Quantidade total inválida.');
  const alterouSaldo = quantidade !== Number(original.quantidade) || cautelada !== Number(original.quantidadeCautelada ?? 0);
  if (alterouSaldo) { texto(operador, 'Responsável pelo ajuste'); texto(motivo, 'Motivo do ajuste', 1000); }
  const historicoRef = doc(collection(db, 'materiais', materialId, 'historico'));
  return runTransaction(db, async tx => {
    const referencia = doc(db, 'materiais', materialId);
    const snapshot = await tx.get(referencia);
    if (!snapshot.exists() || snapshot.data().arquivado) throw new Error('O material não está mais disponível.');
    const atual = snapshot.data();
    for (const k of ['quantidade','quantidadeCautelada','quantidadeTotal','item','observacao','path','localizacao','subLocalizacao']) {
      if (JSON.stringify(atual[k]) !== JSON.stringify(original[k])) throw new Error('O material mudou em outro aparelho. Reabra a edição para conferir o saldo atual.');
    }
    const quantidadeTotal = alterouSaldo || atual.quantidadeTotal == null ? total : inteiro(atual.quantidadeTotal, 'Total');
    const depois = {...dados, quantidade, quantidadeCautelada:cautelada, quantidadeTotal};
    tx.update(referencia, {...depois, updatedAt:serverTimestamp()});
    tx.set(historicoRef, {tipo:alterouSaldo ? 'ajustar_saldo' : 'editar_material', uid:uid || '', operador:alterouSaldo ? operador.trim() : '', motivo:alterouSaldo ? motivo.trim() : '', em:serverTimestamp(),
      antes:{item:atual.item,quantidade:atual.quantidade,quantidadeCautelada:atual.quantidadeCautelada ?? 0,quantidadeTotal:atual.quantidadeTotal ?? null,path:atual.path || []},
      depois:{item:depois.item,quantidade,quantidadeCautelada:cautelada,quantidadeTotal,path:depois.path || []}});
  });
}
