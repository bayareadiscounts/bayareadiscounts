source "https://rubygems.org"

git_source(:github) {|repo_name| "https://github.com/#{repo_name}" }

gem "github-pages", group: :jekyll_plugins

# Explicit server/runtime deps for local/CI Jekyll serve
gem "webrick"
gem "faraday-retry"

# Required for Ruby 3.4+ (removed from standard library)
gem "csv"
gem "base64"
gem "bigdecimal"
