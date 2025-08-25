import { DOMParser, Readability, serve } from "./deps.ts";


function replaceSrc(doc: Document, url: string) {
	// Get the base URL and
	// replace src with /?proxy=baseURL
	const base = new URL(url).origin;
	const srcs = doc.querySelectorAll("[src]");
	for (const src of srcs) {
		const srcUrl = new URL(src.getAttribute("src") as string, base);
		src.setAttribute("src", `/?proxy=${srcUrl}`);
	}
// 	const srcsets = doc.querySelectorAll("[srcset]");

// 	for (const srcset of srcsets) {
// 		const srcsetUrls = srcset.getAttribute("srcset")?.split(", ").map((url) => {
// 			const [src, size] = url.split(" ");
// 			return `${base}/${src} ${size}`;
// 		}).join(", ");

// 		if (srcsetUrls) {
// 			srcset.setAttribute("srcset", srcsetUrls);
// 		}
// 	}
}

function replaceHref(doc: Document, url: string) {
	// Get the base URL and
	// replace href with absolute URL
	const base = new URL(url).origin;
	const hrefs = doc.querySelectorAll("[href]");
	for (const href of hrefs) {
		const hrefUrl = new URL(href.getAttribute("href") as string, base);

		href.setAttribute("href", hrefUrl.toString());
	}
}


const handler = async (req: Request): Promise<Response> => {
	const { pathname } = new URL(req.url);

	if (pathname === "/" && !new URL(req.url).searchParams.get("proxy")) {
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
	if (new URL(req.url).searchParams.get("proxy")) {
		const res = await fetch(new URL(req.url).searchParams.get("proxy") as string);

		if (!res.ok) {
			console.log(res);
			return new Response("Not found", { status: 404 });
		}

		return new Response(res.body, {
			headers: {
				...res.headers,
				// Remove the content security policy
				"content-security-policy": "",
			},
		});
	}

	try {
		const baseUrl = new URL(url);
		console.log(url);
		const res = await fetch(url);

		if (!res.ok) {
			console.log(res);
			return new Response("Not found", { status: 404 });
		}

		const parsedDoc = new DOMParser().parseFromString(await res.text(), "text/html") as unknown as Document | null;

		if (!parsedDoc) {
			return new Response("Could not parse document", { status: 500 });
		}

		replaceSrc(parsedDoc, baseUrl.toString());
		replaceHref(parsedDoc, baseUrl.toString());

		const reader = new Readability(parsedDoc);
		const article = reader.parse();

		if (!article) {
			return new Response("Could not parse into html", { status: 400 });
		}


		const html = `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<title>${article.title}</title>
					<link rel="stylesheet" href="/style.css">
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
