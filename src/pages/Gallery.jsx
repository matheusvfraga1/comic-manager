import { useProject } from '../project';
import { Back } from '../components/ui';
import AssetList from '../components/AssetList';

const GALLERIES = {
  artes: {
    title: 'Artes conceituais', filter: { kind: 'concept' }, defaults: { kind: 'concept' }, accept: 'image/*',
    label: 'Arraste artes conceituais (imagens) aqui ou clique para enviar',
  },
  referencias: {
    title: 'Referências e anexos', filter: { kinds: ['reference', 'attachment'] }, defaults: { kind: 'reference' },
    kindForFile: f => (f.type.startsWith('image/') ? 'reference' : 'attachment'),
    label: 'Arraste imagens de referência, PDFs ou qualquer arquivo',
  },
};

export default function Gallery({ name }) {
  const cfg = GALLERIES[name];
  const { project } = useProject();
  return (
    <main>
      <Back to={`/p/${project.id}`}>{project.title}</Back>
      <div className="page-header"><h2>{cfg.title}</h2></div>
      <AssetList key={name} filter={cfg.filter} defaults={cfg.defaults} kindForFile={cfg.kindForFile} accept={cfg.accept} uploadLabel={cfg.label} />
    </main>
  );
}
