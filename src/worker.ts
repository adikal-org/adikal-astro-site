export interface Env {
	ASSETS: { fetch: (request: Request) => Promise<Response> };
	BREVO_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/api/subscribe') {
			return handleSubscribe(request, env);
		}

		// Fallback to serving static assets
		return env.ASSETS.fetch(request);
	},
};

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
	try {
		const data = await request.formData();
		const email = data.get('email');
		const name = data.get('name');
		const message = data.get('message');

		if (!email || !name) {
			return new Response('Missing required fields', { status: 400 });
		}

		const API_KEY = env.BREVO_API_KEY;

		if (!API_KEY) {
			console.error('BREVO_API_KEY not set');
			return new Response('Server configuration error', { status: 500 });
		}

		const response = await fetch('https://api.brevo.com/v3/contacts', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'api-key': API_KEY,
				'accept': 'application/json',
			},
			body: JSON.stringify({
				email: email,
				attributes: {
					FIRSTNAME: name,
                    MESSAGE: message,
                    // Note: Ensure your Brevo list has a 'MESSAGE' attribute if you want to save it
                    // Or add it to a specific transactional email trigger
				},
				updateEnabled: true,
				listIds: [6],
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Brevo Error:', errorData);
            // In a real app, you might want to redirect to an error page
			return new Response('Failed to subscribe. Please try again.', { status: 500 });
		}

        // Redirect to the thank you page on success
		return Response.redirect(new URL('/thank-you', request.url).toString(), 303);

	} catch (error) {
		console.error(error);
		return new Response('Error submitting form', { status: 500 });
	}
}
