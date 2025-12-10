FROM openpolicyagent/opa:latest

# Copy policies
COPY policies /policies

# Run OPA server with policies
CMD ["run", "--server", "--addr", "0.0.0.0:8181", "/policies"]
