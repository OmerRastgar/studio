FROM openpolicyagent/opa:latest-debug

# Copy policies
COPY policies /policies

# Run OPA server with policies
CMD ["run", "--server", "--addr", "0.0.0.0:8181", "/policies"]
