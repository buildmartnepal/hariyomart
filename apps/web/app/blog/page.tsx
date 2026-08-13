import { BookOpen, Sprout } from 'lucide-react';
import { BlogJournal } from '@/components/BlogJournal';
export default function Blog() {
  return (
    <main>
      <section className="page-hero blog-hero">
        <div className="container">
          <span className="eyebrow">Hariyo Journal</span>
          <h1>Know your food. Meet the people growing it.</h1>
          <p className="section-copy">
            Practical buying guides, regional food knowledge and field-tested lessons for farmers
            building a digital business in Nepal.
          </p>
          <div className="blog-topic-row">
            <span>
              <BookOpen size={16} /> Buying guides
            </span>
            <span>
              <Sprout size={16} /> Farm stories
            </span>
            <span>🍲 Food knowledge</span>
            <span>🧺 Seller academy</span>
          </div>
        </div>
      </section>
      <section className="section journal-section">
        <div className="container">
          <BlogJournal />
        </div>
      </section>
    </main>
  );
}
