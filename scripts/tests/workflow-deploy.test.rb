#!/usr/bin/env ruby

require "yaml"

project_root = File.expand_path("../..", __dir__)
workflow = YAML.load_file(File.join(project_root, ".github/workflows/pipeline.yml"))
deploy = workflow.fetch("jobs").fetch("deploy")

def assert(condition, message)
  raise message unless condition
end

assert(deploy.fetch("needs") == "publish", "deploy job must wait for publish")
assert(deploy.fetch("if") == "github.event_name == 'push' && github.ref == 'refs/heads/main'", "deploy job must run only for main push")
assert(deploy.fetch("runs-on") == ["self-hosted", "macOS", "ARM64", "rwr-production"], "deploy runner labels must select the Mac production runner")
assert(deploy.fetch("environment") == "production", "deploy job must use the production environment")

steps = deploy.fetch("steps")
assert(steps.any? { |step| step["uses"] == "actions/checkout@v7" }, "deploy job must check out the exact main commit")

deploy_step = steps.find { |step| step["name"] == "Deploy published SHA on Mac mini" }
assert(deploy_step, "deploy command step is missing")

command = deploy_step.fetch("run")
assert(command.include?("scripts/deploy-mac.sh"), "deploy job must call deploy-mac.sh")
assert(command.include?("\${{ github.sha }}"), "deploy job must pass the workflow commit SHA")
assert(command.include?("\${{ vars.RWR_DEPLOY_DIR }}"), "deploy job must use the configured fixed deployment directory")
assert(!command.match?(/docker\s+(?:compose\s+)?build/), "deploy job must not build on the Mac runner")

puts "PASS: main publish 이후 Mac 고정 경로 배포 workflow 계약"
