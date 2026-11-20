const EMBEDDING_DIM = 384;

type Extractor = (text: string, options: { pooling: 'mean'; normalize: true }) => Promise<{ data: Float32Array | number[] }>;

let extractorPromise: Promise<Extractor> | null = null;

async function loadExtractor(): Promise<Extractor> {
  const transformers = await import('@xenova/transformers');
  const { pipeline, env } = transformers as unknown as {
    pipeline: (task: string, model: string) => Promise<Extractor>;
    env: {
      cacheDir: string;
      allowLocalModels: boolean;
      backends: { onnx: { wasm: { numThreads: number } } };
    };
  };

  env.allowLocalModels = false;
  env.cacheDir = process.env.TRANSFORMERS_CACHE || '.cache/transformers';
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}

/**
 * 384-d normalized MiniLM embeddings, the same width as document_chunks.embedding.
 * The model is downloaded once into .cache/transformers.
 */
export async function embedText(text: string): Promise<number[]> {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!clean) return new Array(EMBEDDING_DIM).fill(0);

  if (!extractorPromise) {
    extractorPromise = loadExtractor().catch((err) => {
      extractorPromise = null;
      throw err;
    });
  }

  const extractor = await extractorPromise;
  const output = await extractor(clean, { pooling: 'mean', normalize: true });
  const values = Array.from(output.data).slice(0, EMBEDDING_DIM);
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(`Embedding model returned ${values.length} dimensions, expected ${EMBEDDING_DIM}`);
  }
  return values.map((value) => Number(value.toFixed(6)));
}
