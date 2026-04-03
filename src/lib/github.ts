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

const CMS_EXTENSIONS = ['.html', '.tsx', '.jsx']

/** List all editable files (HTML, TSX, JSX) in a repo recursively */
export async function listEditableFiles(repo: string, branch: string): Promise<{ name: string; path: string }[]> {
  const tree = await githubFetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`
  )
  return (tree.tree as GitHubFile[])
    .filter((f: GitHubFile) => f.type === 'blob' && CMS_EXTENSIONS.some(ext => f.path.endsWith(ext)) && !f.path.includes('node_modules/'))
    .map((f: GitHubFile) => ({ name: f.path.split('/').pop() || f.path, path: f.path }))
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
