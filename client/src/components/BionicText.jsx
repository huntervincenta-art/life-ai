import { bionicify } from '../utils/bionicText';

export default function BionicText({ children, as: Tag = 'span', className = '', style = {} }) {
  const text = typeof children === 'string' ? children : '';
  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: bionicify(text) }}
    />
  );
}
