const localStorageKey = "TagStore|v1";

// --------------------
// Tag structure
// --------------------
interface Tag {
  id: string; // Unique ID for the tag
  name: string; // Tag name
  createdAt: number; // Timestamp
  lastUpdatedAt: number; // Timestamp
  contentIds: Set<string>; // Content IDs associated with the tag
}

// --------------------
// Main Tag Store
// --------------------
export class TagStore {
  private tags: Map<string, Tag> = new Map<string, Tag>();
  private normalizedTagMap: Map<string, string> = new Map<string, string>();
  private trie: Trie = new Trie();
  private relatedGraph: Map<string, Set<string>> = new Map();

  constructor() {
    try {
      const localStorageValue = localStorage.getItem(localStorageKey);
      if (
        localStorageValue &&
        typeof localStorageKey === "string" &&
        localStorageKey.length
      ) {
        this.importJSON(localStorageValue);
      }
    } catch (err: unknown) {
      const error = err as Error;
    }
  }

  // Add or update a tag
  addTag(name: string, contentId: string) {
    const key = name.toLowerCase();
    let tag = this.tags.get(key);

    if (!tag) {
      tag = {
        id: key,
        name,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        contentIds: new Set(),
      };
      this.tags.set(key, tag);
      this.trie.insert(name);
      this.normalizedTagMap.set(key, name);
    }

    if (contentId) {
      tag.contentIds.add(contentId);
      tag.lastUpdatedAt = Date.now();
    }
  }

  addTags(names: Array<string>, contentId: string) {
    for (const name of names) {
      this.addTag(name, contentId);
    }
    this.exportJSON();
  }

  // Get suggestions for auto-complete
  suggest(prefix: string): string[] {
    return this.trie
      .suggest(prefix)
      .map((value) => this.normalizedTagMap.get(value))
      .filter((x) => x !== undefined);
  }

  // Add relationship between tags
  addRelationship(tag1: string, tag2: string) {
    if (!this.relatedGraph.has(tag1)) this.relatedGraph.set(tag1, new Set());
    if (!this.relatedGraph.has(tag2)) this.relatedGraph.set(tag2, new Set());
    this.relatedGraph.get(tag1)!.add(tag2);
    this.relatedGraph.get(tag2)!.add(tag1);
  }

  // Export to JSON
  exportJSON() {
    const data = {
      tags: Array.from(this.tags.values()).map((tag) => ({
        ...tag,
        contentIds: Array.from(tag.contentIds),
      })),
      relatedGraph: Array.from(this.relatedGraph.entries()).map(
        ([key, set]) => [key, Array.from(set)]
      ),
      trie: this.trie.exportJSON(),
    };
    const value = JSON.stringify(data, null, 2);
    localStorage.setItem(localStorageKey, value);
    console.log("[exportJSON]", value);
  }

  // Import from JSON
  importJSON(jsonString: string) {
    const data = JSON.parse(jsonString);
    console.log("[importJSON]", jsonString);
    this.tags.clear();
    this.relatedGraph.clear();

    for (const t of data.tags) {
      this.tags.set(t.id, {
        ...t,
        contentIds: new Set(t.contentIds),
      });
      this.trie.insert(t.name);
    }

    for (const [key, values] of data.relatedGraph) {
      this.relatedGraph.set(key, new Set(values));
    }
  }
}

// --------------------
// Trie for auto-suggest
// --------------------
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;

  toJSON(): { isEnd: boolean; children: Record<string, any> } {
    return {
      isEnd: this.isEnd,
      children: Object.fromEntries(
        Array.from(this.children.entries()).map(([char, node]) => [
          char,
          node.toJSON(),
        ])
      ),
    };
  }
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string) {
    console.log("[trie] insert(word)", word);
    let node = this.root;
    const lowerWord = word.toLowerCase();
    for (const char of lowerWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
  }

  suggest(prefix: string): string[] {
    const results: string[] = [];
    let node = this.root;
    const lowerPrefix = prefix.toLowerCase();

    // Navigate to the prefix node
    for (const char of lowerPrefix) {
      if (!node.children.has(char)) {
        console.log("[trie] suggest char doesn't exist", char);
        return results;
      }
      node = node.children.get(char)!;
    }

    // Start DFS from the prefix node, not the root!
    this.dfs(node, lowerPrefix, results);
    return results;
  }

  private dfs(node: TrieNode, currentWord: string, results: string[]) {
    // If this node marks the end of a word, add it to results
    if (node.isEnd) {
      results.push(currentWord);
    }

    // Continue DFS for all children
    for (const [char, child] of node.children.entries()) {
      this.dfs(child, currentWord + char, results);
    }
  }

  exportJSON(): { isEnd: boolean; children: Record<string, any> } {
    return this.root.toJSON();
  }
}
