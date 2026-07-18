-- Soft lifecycle states: records remain queryable for audit purposes.
alter type outbound_status add value if not exists 'closed';
alter type outbound_status add value if not exists 'deleted';

-- The MVP migration may use a consignment status enum in production.
-- Add equivalent `closed` and `deleted` values before applying lifecycle actions.
