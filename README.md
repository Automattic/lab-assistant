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

### Requirements

`lab-assistant` requires Node.js 22.19 or newer.

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
                      the results aren't comparable to direct measuring.
                                                      [boolean] [default: false]
  -r, --repeat        The number of measurements to take for each version. Must
                      be at least 2.                      [number] [default: 10]
  -t, --throwaway     The number of throwaway visits to perform before any
                      actual measurements.
                      Keeping it at 1 or increasing the value can help with
                      stability.                           [number] [default: 1]
  -c, --cpu_slowdown  The CPU slowdown throttling to apply (may help achieve
                      more stable results in CPU-heavy pages).          [number]
  -n, --network       The network throttling to apply.
                      Throttling can't be combined with `ttfb` or Lighthouse.
                      Profiles:
                      - none: No throttling
                      - fast-4g: 8.1 Mbps down, 1.35 Mbps up, 165ms latency
                      (DevTools "Fast 4G")
                      - slow-4g: 1.44 Mbps down, 675 kbps up, 562.5ms latency
                      (DevTools "Slow 4G")
                      - slow-3g: 400 kbps down, 400 kbps up, 2000ms latency
                      (DevTools "3G")
                      - legacy: 1.68 Mbps down, 786 kbps up, 150ms latency
           [string] [choices: "none", "fast-4g", "slow-4g", "slow-3g", "legacy"]
                                                               [default: "none"]
  -w, --wait          The point to wait for before taking measurements.
                      Can't be changed in Lighthouse mode.
                      Points:
                      - load: The load event
                      - network-idle: load, then no network requests for 500ms
                    [string] [choices: "load", "network-idle"] [default: "load"]
      --wait_extra    Additional seconds to wait after the `--wait` point (may
                      help capture late LCP and layout shifts).
                      Can't be changed in Lighthouse mode. [number] [default: 0]
  -m, --metric        The metric to consider.
                      Metrics:
                      - ttfb: Time to First Byte (unthrottled network only)
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

## Testing

```
npm test
npm run test:cli
npm audit --audit-level=low
```

## License

lab-assistant is licensed under
[GNU General Public License v2 (or later)](./LICENSE.md).
