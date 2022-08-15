# lab-assistant

`lab-assistant` is a Puppeteer-based tool that does the grunt work of taking
measurements and figuring out how much of a performance change there is between
two different versions of your site.

This is a useful tool to run every time you're working on a loading performance
improvement. It will help you gauge whether the improvement is real and not
just placebo, and it'll give you a number to attach to your PR description, blog
post, or annual employee self-assessment survey.

Impress your peers with actual numbers!


## Usage

The easiest way to use `lab-assistant` is with a tool like
[`npx`](https://www.npmjs.com/package/npx):

```
npx lab-assistant http://v1.mysite.tld http://v2.mysite.tld
```

Here's the current full set of options (which you can get with `--help`):

```
lab-assistant.js <url> [url2]

Positionals:
  url   URL to fetch content from.
        If `url2` is not specified, this is used for both the new and old
        versions, with the application pausing in between to allow for the
        version swap.
  url2  Second URL to fetch content from.
        If specified, this refers to the new version, while `url` refers to
        the old version.

Options:
      --help          Show help                                        [boolean]
  -v, --verbose       Output more details.            [boolean] [default: false]
      --headless      Whether to use a headless browser.
                                                       [boolean] [default: true]
  -l, --lighthouse    Whether to run the tests through Lighthouse.
                      Measuring through Lighthouse is significantly slower, and
                      the results
                      aren't comparable to direct measuring.
                                                      [boolean] [default: false]
  -r, --repeat        The number of measurements to take for each version.
                                                          [number] [default: 10]
  -t, --throwaway     The number of throwaway visits to perform before any
                      actual measurements.
                      Keeping it at 1 or increasing the value can help with
                      stability.                           [number] [default: 1]
  -c, --cpu_slowdown  The CPU slowdown throttling to apply (may help achieve
                      more stable results in CPU-heavy pages).          [number]
  -m, --metric        The metric to consider.
                                        Metrics:
                      - ttfb: Time to First Byte
                      - fp: First Paint
                      - fcp: First Contentful Paint
                      - dcl: Time to DOMContentLoad event end
                      - load: Time to Load event end
                      - lcp: Largest Contentful Paint
                      - cls: Cumulative Layout Shift
                      - tti: Time To Interactive (Lighthouse only)
                      - tbt: Total Blocking Time (Lighthouse only)
     [string] [choices: "ttfb", "fp", "fcp", "dcl", "load", "lcp", "cls", "tti",
                                                        "tbt"] [default: "load"]
```

## License

lab-assistant is licensed under
[GNU General Public License v2 (or later)](./LICENSE.md).
