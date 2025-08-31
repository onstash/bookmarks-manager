import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./utils/local-storage-util";

const localStorageKey = "TagStore|v1";

// --------------------
// Tag structure
// --------------------
interface Tag {
  id: string; // Unique ID for the tag
  name: string; // Tag name
  createdAt: number; // Timestamp
  lastUpdatedAt: number; // Timestamp
  contentIds: Record<string, number>; // Content IDs associated with the tag
}

interface TagStoreJSON {
  tags: Record<string, Tag>;
  normalizedTagMap: Record<string, string>;
  trie: Trie;
  relatedGraph: Record<string, Record<string, number>>; // Array of entries for JSON
}

// --------------------
// Main Tag Store
// --------------------
export class TagStore {
  private tags: TagStoreJSON["tags"] = {};
  private normalizedTagMap: TagStoreJSON["normalizedTagMap"] = {};
  private trie: TagStoreJSON["trie"] = new Trie();
  private relatedGraph: TagStoreJSON["relatedGraph"] = {};

  constructor() {
    try {
      const localStorageValue = loadFromLocalStorage(localStorageKey);
      console.log("[localStorageValue]", localStorageValue);
      if (localStorageValue) {
        this.importJSONFromString(localStorageValue);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to load from localStorage:", error);
    }
  }

  // Add or update a tag
  addTag(name: string, contentId: string) {
    const key = name.toLowerCase();
    let tag = this.tags[key];

    if (!tag) {
      tag = {
        id: key,
        name,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        contentIds: {},
      };
      this.tags[key] = tag;
      this.trie.insert(name);
      this.normalizedTagMap[key] = name;
    }

    if (contentId) {
      tag.contentIds[contentId] = 1; // Add to Record
      tag.lastUpdatedAt = Date.now();
    }
  }

  addTags(names: Array<string>, contentId: string) {
    for (const name of names) {
      this.addTag(name, contentId);
    }
    this.exportJSONIntoString();
  }

  // Get suggestions for auto-complete
  suggest(prefix: string): string[] {
    return this.trie
      .suggest(prefix)
      .map((value) => this.normalizedTagMap[value])
      .filter((x) => x !== undefined);
  }

  // Add relationship between tags
  addRelationship(tag1: string, tag2: string) {
    if (!this.relatedGraph[tag1]) this.relatedGraph[tag1] = {};
    if (!this.relatedGraph[tag2]) this.relatedGraph[tag2] = {};
    this.relatedGraph[tag1][tag2] = 1;
    this.relatedGraph[tag2][tag1] = 1;
  }

  // Export to JSON
  exportJSONIntoString(options?: { dryRun: boolean }) {
    const data: TagStoreJSON = {
      tags: this.tags, // No conversion needed
      normalizedTagMap: this.normalizedTagMap,
      relatedGraph: this.relatedGraph,
      trie: this.trie, // Direct assignment since TrieNode is already JSON-serializable
    };
    const value = JSON.stringify(data, null, 2);
    options?.dryRun === false && saveToLocalStorage(localStorageKey, value);
    console.log("[exportJSONIntoString]", {
      data,
      value,
    });
  }

  // Import from JSON
  importJSONFromString(jsonString: string) {
    const data: TagStoreJSON = JSON.parse(jsonString);
    // Clear existing data
    this.tags = {};
    this.normalizedTagMap = data.normalizedTagMap || {};
    this.relatedGraph = {};
    this.trie = new Trie();

    // Import tags
    if (data.tags) {
      for (const tag of Object.values(data.tags)) {
        this.tags[tag.id] = tag; // Direct assignment since types match
        this.trie.insert(tag.name);
      }
    }

    // Import related graph
    if (data.relatedGraph) {
      for (const [key, relations] of Object.entries(data.relatedGraph)) {
        this.relatedGraph[key] = {};
        for (const relation of Object.keys(relations)) {
          this.relatedGraph[key][relation] = 1;
        }
      }
    }

    this.exportJSONIntoString({ dryRun: true });
  }
}

// --------------------
// Trie for auto-suggest
// --------------------
class TrieNode {
  children: Record<string, TrieNode> = {};
  isEnd: boolean = false;
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string) {
    console.log("[trie] insert(word)", word);
    let node = this.root;
    const lowerWord = word.toLowerCase();
    for (const char of lowerWord) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEnd = true;
  }

  suggest(prefix: string): string[] {
    const results: string[] = [];
    let node = this.root;
    const lowerPrefix = prefix.toLowerCase();

    // Navigate to the prefix node
    for (const char of lowerPrefix) {
      if (!node.children[char]) {
        console.log("[trie] suggest char doesn't exist", char);
        return results;
      }
      node = node.children[char];
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
    for (const [char, child] of Object.entries(node.children)) {
      this.dfs(child, currentWord + char, results);
    }
  }
}
