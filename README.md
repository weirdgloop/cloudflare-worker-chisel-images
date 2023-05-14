A CloudFlare worker that powers https://r2.weirdgloop.org. This allows (read) access to the contents of the chisel-images and imgur-backup R2 buckets.

Supports URL formats:
* Imgur backup:
* * `/imgur/{image hash}.{any ext}`, `/imgur/{image hash}`: images (returns the correct file format in content-type header)
* * `/imgur/{album hash}/{image hash}`, `/imgur/{album hash}/{image hash}.{any ext}`: an image from an album
* * `/imgur/{album hash}`, `/imgur/{album hash}/`: returns a bullet list of album contents
* Chisel images:
* * any url that doesn't start `/imgur/`. See the specific projects for valid pathnames.