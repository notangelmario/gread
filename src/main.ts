import { DOMParser, serve, Readability } from "./deps.ts";

const handler = async (req: Request): Promise<Response> => {
	const { pathname } = new URL(req.url);
	
	if (pathname === "/") {
		return new Response(Deno.readFileSync("./src/resources/index.html"), {
			headers: {
				"content-type": "text/html; charset=UTF-8",
			},
		});
	}

	if (pathname === "/home.css") {
		return new Response(Deno.readFileSync("./src/resources/home.css"), {
			headers: {
				"content-type": "text/css; charset=UTF-8",
			},
		});
	}


	if (pathname === "/style.css") {
		return new Response(Deno.readFileSync("./src/resources/style.css"), {
			headers: {
				"content-type": "text/css; charset=UTF-8",
			},
		});
	}

	const url = pathname.slice(1);

	// Check if the url is valid
	try {
		new URL(url.startsWith("cached/") ? url.slice(7) : url);

		const query = url.startsWith("cached/") ? `http://webcache.googleusercontent.com/search?sclient=psy&hl=en&biw=1440&bih=728&source=hp&q=cache%3A${url.slice(7)}&pbx=1&oq=cache%3A${url.slice(7)}&aq=f&aqi=g5&aql=1&gs_sm=e&gs_upl=3639l7768l0l8083l20l4l0l0l0l0l194l603l0.4l4l0` : url;
		console.log(query);
		const res = await fetch(query);

		if (!res.ok) {
			console.log(res);
			return new Response("Not found", { status: 404 });
		}

		const parsedDoc = new DOMParser().parseFromString(await res.text(), "text/html");
		const reader = new Readability(parsedDoc);	
		const article = reader.parse();

		const html = `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<title>${article.title}</title>
					<link rel="stylesheet" href="/style.css">
					<base href="${url.startsWith("cached/") ? url.slice(7) : url}">
				</head>
				<body>
					<main>
						${article.content}
					</main>
				</body>
			</html>
					
		`

		return new Response(html, {
			headers: {
				"content-type": "text/html; charset=UTF-8",
			},
		});

	} catch (e) {
		console.log(e);
		return new Response("Invalid url", { status: 400 });
	}
}

await serve(handler, { port: 8080 });
