import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { App } from 'octokit';
import { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY } from '$env/static/private';

const APP_ID = GITHUB_APP_ID;
let PRIVATE_KEY = GITHUB_APP_PRIVATE_KEY;

if (PRIVATE_KEY) {
	// 1. Handle literal \n (e.g. "Line1\nLine2")
	if (PRIVATE_KEY.includes('\\n')) {
		PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
	}

	// 2. Handle single-line keys (e.g. "-----BEGIN... MII... ...END-----")
	if (!PRIVATE_KEY.includes('\n')) {
		console.log('Formatting single-line Private Key...');
		PRIVATE_KEY = PRIVATE_KEY.replace(
			'-----BEGIN RSA PRIVATE KEY-----',
			'-----BEGIN RSA PRIVATE KEY-----\n'
		).replace('-----END RSA PRIVATE KEY-----', '\n-----END RSA PRIVATE KEY-----');

		// If the body still has spaces, replace them with newlines
		const parts = PRIVATE_KEY.split('\n');
		if (parts.length >= 3) {
			// parts[1] is the body
			parts[1] = parts[1].replace(/ /g, '\n');
			PRIVATE_KEY = parts.join('\n');
		}
	}
}

// OPTIONS: Handle CORS preflight requests
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};

// GET: Handle GitHub App Callback (Installation)
export const GET: RequestHandler = () => {
	return new Response('GitHub App installed successfully! You can now use the plugin.', {
		status: 200,
		headers: {
			'Content-Type': 'text/plain',
			'Access-Control-Allow-Origin': '*'
		}
	});
};

// POST: Create Pull Request
export const POST: RequestHandler = (async ({ request }) => {
	console.log('Received request to create PR');

	// Handle CORS for the actual request
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type'
			}
		});
	}

	const { repo, content } = (await request.json()) as { repo: string; content: string };
	console.log(`Repo: ${repo}, Content Length: ${content ? content.length : 0}`);

	if (!repo || !content) {
		return json(
			{ error: 'Missing repo or content' },
			{
				status: 400,
				headers: { 'Access-Control-Allow-Origin': '*' }
			}
		);
	}

	if (!APP_ID || !PRIVATE_KEY) {
		console.error('Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY');
		return json(
			{ error: 'Server configuration error' },
			{
				status: 500,
				headers: { 'Access-Control-Allow-Origin': '*' }
			}
		);
	}

	// Debug Private Key Format (without revealing secrets)
	console.log('--- Private Key Debug ---');
	console.log('Length:', PRIVATE_KEY.length);
	console.log('Contains literal \\n:', GITHUB_APP_PRIVATE_KEY?.includes('\\n'));
	console.log('Contains actual newline:', PRIVATE_KEY.includes('\n'));
	console.log(
		'Starts with Header:',
		PRIVATE_KEY.trim().startsWith('-----BEGIN RSA PRIVATE KEY-----')
	);
	console.log('Ends with Footer:', PRIVATE_KEY.trim().endsWith('-----END RSA PRIVATE KEY-----'));
	console.log('-------------------------');

	try {
		const app = new App({
			appId: APP_ID,
			privateKey: PRIVATE_KEY
		});

		const [owner, repoName] = repo.split('/');
		if (!owner || !repoName) {
			return json(
				{ error: 'Invalid repository format. Use owner/repo' },
				{
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' }
				}
			);
		}

		// 1. Get installation for the repo
		let installation;
		try {
			const { data } = await app.octokit.request('GET /repos/{owner}/{repo}/installation', {
				owner,
				repo: repoName
			});
			installation = data;
		} catch (e) {
			console.error('Error getting installation:', e);
			return json(
				{ error: 'App not installed on this repository or repository not found' },
				{
					status: 404,
					headers: { 'Access-Control-Allow-Origin': '*' }
				}
			);
		}

		// 2. Get authenticated octokit for this installation
		const octokit = await app.getInstallationOctokit(installation.id);

		// 3. PR Logic
		const branchName = `update-tokens-${Date.now()}`;
		const path = 'tokens.css';
		const message = 'Update design tokens';
		const fileContent = Buffer.from(content).toString('base64');

		// Get default branch
		const { data: repoData } = await octokit.request('GET /repos/{owner}/{repo}', {
			owner,
			repo: repoName
		});
		const defaultBranch = repoData.default_branch;

		// Get SHA of default branch
		const { data: refData } = await octokit.request(
			'GET /repos/{owner}/{repo}/git/ref/heads/{ref}',
			{
				owner,
				repo: repoName,
				ref: defaultBranch
			}
		);
		const sha = refData.object.sha;

		// Create new branch
		await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
			owner,
			repo: repoName,
			ref: `refs/heads/${branchName}`,
			sha
		});

		// Check if file exists (to get SHA for update)
		let fileSha;
		try {
			const { data: fileData } = await octokit.request(
				'GET /repos/{owner}/{repo}/contents/{path}',
				{
					owner,
					repo: repoName,
					path,
					ref: branchName
				}
			);
			if (!Array.isArray(fileData)) {
				fileSha = fileData.sha;
			}
		} catch (e) {
			// File doesn't exist, that's fine
			console.log('File does not exist, will create new file.', e);
		}

		// Create or Update file
		await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
			owner,
			repo: repoName,
			path,
			message,
			content: fileContent,
			branch: branchName,
			...(fileSha ? { sha: fileSha } : {})
		});

		// Create PR
		const { data: prData } = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
			owner,
			repo: repoName,
			title: 'Update Design Tokens',
			body: 'Automated PR from Figma Plugin via GitHub App',
			head: branchName,
			base: defaultBranch
		});

		return json(
			{ status: 'success', url: prData.html_url },
			{
				headers: { 'Access-Control-Allow-Origin': '*' }
			}
		);
	} catch (error) {
		console.error('Error creating PR:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to create PR';
		return json(
			{ error: errorMessage },
			{
				status: 500,
				headers: { 'Access-Control-Allow-Origin': '*' }
			}
		);
	}
}) satisfies RequestHandler;
