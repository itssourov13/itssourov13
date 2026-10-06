/** Project relationships — only from real shared topics or shared primary language. */
export interface GraphNode {
  topics: string[];
  language?: string | null;
}
export interface Relationship {
  a: number;
  b: number;
  kind: 'topic' | 'language';
  label: string;
}

/** Topic overlap wins over language overlap; indices are into `nodes`, always a < b. */
export function buildRelationships(nodes: GraphNode[]): Relationship[] {
  const out: Relationship[] = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const na = nodes[a]!;
      const nb = nodes[b]!;
      const shared = na.topics.find((t) => nb.topics.includes(t));
      if (shared) out.push({ a, b, kind: 'topic', label: shared });
      else if (na.language && na.language === nb.language) out.push({ a, b, kind: 'language', label: na.language });
    }
  }
  return out;
}
