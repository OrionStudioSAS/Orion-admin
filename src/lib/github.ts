const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

interface GitHubFile {
  name: string
  path: string
  type: string
  sha: string
}

interface GitHubContent {
  content: string
  sha: string
  path: string
}

async function githubFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body}`)
  }
  return res.json()
}

/** Find the constants file (constants.ts or constants.tsx) in the repo */
export async function findConstantsFile(repo: string, branch: string): Promise<string | null> {
  const tree = await githubFetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`
  )
  const file = (tree.tree as GitHubFile[]).find(
    (f: GitHubFile) => f.type === 'blob' && /constants\.(ts|tsx)$/.test(f.path) && !f.path.includes('node_modules/')
  )
  return file?.path || null
}

/** Get decoded file content + sha (for updates) */
export async function getFileContent(repo: string, branch: string, path: string): Promise<GitHubContent> {
  const data = await githubFetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`
  )
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { content, sha: data.sha, path: data.path }
}

/** Update a file and commit */
export async function updateFileContent(
  repo: string,
  branch: string,
  path: string,
  content: string,
  sha: string,
  message: string
): Promise<void> {
  await githubFetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        sha,
        branch,
      }),
    }
  )
}
