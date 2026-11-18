import { Compass, Heart, Save } from 'lucide-react';
import type { FutureVision } from '../types';
import { PageHeading, Panel } from '../components/UI';

const prompts: { key: keyof FutureVision; number: string; title: string; hint: string; placeholder: string }[] = [
  { key: 'threeMonths', number: '01', title: 'Daqui a 3 meses', hint: 'Um horizonte próximo para dar o primeiro passo.', placeholder: 'O que gostaria de ter iniciado, aprendido ou ajustado?' },
  { key: 'oneYear', number: '02', title: 'Daqui a 1 ano', hint: 'O que gostaria de reconhecer ao olhar para trás?', placeholder: 'Que mudanças ou conquistas fariam diferença?' },
  { key: 'threeYears', number: '03', title: 'Daqui a 3 anos', hint: 'Um espaço para imaginar possibilidades.', placeholder: 'Como gostaria que fossem seus dias, projetos ou relações?' },
  { key: 'values', number: '04', title: 'O que importa para mim', hint: 'Seus valores ajudam a escolher uma direção.', placeholder: 'O que você quer proteger, priorizar e levar consigo?' },
];

export default function FuturePage({ vision, onChange }: { vision: FutureVision; onChange: (key: keyof FutureVision, value: string) => void }) {
  const filled = Object.values(vision).filter((value) => value.trim()).length;
  return <>
    <PageHeading eyebrow="SEU PRÓXIMO CAPÍTULO" title="Visão de futuro" description="Lembre-se não só do que precisa fazer hoje, mas do que quer construir amanhã." />
    <div className="vision-intro"><span className="vision-compass"><Compass size={22} /></span><div><strong>Não precisa ter todas as respostas.</strong><p>Use este espaço para registrar expectativas, valores e possibilidades. Seus planos podem mudar — você também.</p></div><span className="vision-count">{filled}<small>/ 4</small></span></div>
    <div className="vision-grid">{prompts.map((prompt) => <Panel className={`vision-card vision-card-${prompt.number}`} key={prompt.key}><div className="vision-card-head"><span>{prompt.number}</span>{prompt.key === 'values' ? <Heart size={17} /> : <Compass size={17} />}</div><h2>{prompt.title}</h2><p>{prompt.hint}</p><textarea className="vision-textarea" value={vision[prompt.key]} onChange={(event) => onChange(prompt.key, event.target.value)} placeholder={prompt.placeholder} maxLength={2000} aria-label={prompt.title} /><div className="vision-save"><Save size={13} /><span>O AXIS tenta salvar neste navegador</span></div></Panel>)}</div>
    <p className="vision-footer">Ações presentes ganham clareza quando lembram o que realmente importa.</p>
  </>;
}
