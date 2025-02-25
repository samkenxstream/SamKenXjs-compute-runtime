/* eslint-env serviceworker */

addEventListener("fetch", (event) => {
  let requestsData = [
    {
      url: "https://compute-sdk-test-backend.edgecompute.app/async_select_1",
      backend: "TheOrigin",
      header: "fooname",
    },
    {
      url: "https://compute-sdk-test-backend.edgecompute.app/async_select_2",
      backend: "TheOrigin2",
      header: "barname",
    },
  ];

  let pending = requestsData.map((data) => {
    let request = new Request(data.url);
    return fetch(request, { backend: data.backend });
  });

  event.respondWith(processUpstreamRequests(pending, requestsData));
});
async function processUpstreamRequests(requests, requestsData) {
  // Create our response headers we will be sending downstream
  let responseHeaders = new Headers();

  // Loop through our requests
  for await (let response of select(requests)) {
    // Check which response we got, so we know which header to
    // copy over to our response headers
    let { header } = requestsData.find((data) => data.url == response.url);

    // Set the appropriate header on our response
    let headerValue = response.headers.get(header);
    if (headerValue == null) {
      throw new Error(
        "No header value on the response from the request with url " +
          response.url +
          " and with the header name: " +
          header
      );
    }
    responseHeaders.set(header, headerValue);
  }

  // Send our response downstream
  return new Response("pong", {
    headers: responseHeaders,
  });
}

async function* select(promises) {
  promises = promises.map((promise) => {
    promise.finally(() => {
      promises.splice(promises.indexOf(promise), 1);
    });
    return promise;
  });

  while (promises.length) {
    yield await Promise.any(promises);
  }
}
