// ===== SEARCH ENGINE =====
const SearchEngine = {
    index: null,
    documents: {},

    build(videos) {
        this.documents = {};
        videos.forEach(v => this.documents[v.id] = v);

        this.index = lunr(function () {
            this.ref('id');
            this.field('title', { boost: 10 });
            this.field('tags', { boost: 5 });
            this.field('description');

            videos.forEach(v => {
                this.add({
                    id: v.id,
                    title: v.title || '',
                    tags: v.tags || '',
                    description: v.description || ''
                });
            });
        });
    },

    search(videos, query) {
        this.build(videos);
        if (!this.index) return [];
        
        try {
            // Fuzzy search with wildcards
            const queryTerms = query.split(/\s+/).filter(t => t.length > 0);
            const luceneQuery = queryTerms.map(t => `${t}* ${t}~1`).join(' ');
            const results = this.index.search(luceneQuery);
            return results.map(r => this.documents[r.ref]).filter(Boolean);
        } catch (e) {
            // Fallback to simple search
            const q = query.toLowerCase();
            return videos.filter(v => 
                v.title.toLowerCase().includes(q) ||
                (v.tags || '').toLowerCase().includes(q) ||
                (v.description || '').toLowerCase().includes(q)
            );
        }
    }
};
