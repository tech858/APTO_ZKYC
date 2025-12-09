/// ZKYC Commitment Module - Architecture Specification
module zkyc_addr::ZKYCCommitment {
    use std::signer;
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_framework::timestamp;
    use aptos_framework::event;

    // ------ Error Codes ------

    /// Caller is not the module owner
    const ENOT_OWNER: u64 = 1;
    /// Commitment already exists
    const ECOMMITMENT_EXISTS: u64 = 2;
    /// Commitment not found
    const ECOMMITMENT_NOT_FOUND: u64 = 3;
    /// Invalid hash format
    const EINVALID_HASH: u64 = 5;

    struct ProofCommitment has store, drop, copy {
        hash: vector<u8>,
        issuer_id: u64,
        validity_window: u64,
        timestamp: u64
    }

    struct CommitmentStore has key {
        commitments: SmartTable<vector<u8>, ProofCommitment>,
        total_count: u64
    }

    #[event]
    struct CommitmentPublished has drop, store {
        hash: vector<u8>,
        issuer_id: u64,
        validity_window: u64,
        timestamp: u64
    }

    #[event]
    struct CommitmentRevoked has drop, store {
        hash: vector<u8>,
        revoked_at: u64
    }

    fun init_module(owner: &signer) {
        // Asign the CommitmentStore - the one that hold public and private keys - to the owners
        move_to(owner, CommitmentStore {
            commitments: smart_table::new(),
            total_count: 0
        });
    }

    public entry fun publish_commitment(
        account: &signer,
        hash: vector<u8>,
        issuer_id: u64,
        validity_window: u64
    ) acquires CommitmentStore {

        let signer_addr = signer::address_of(account);
        assert!(signer_addr == @zkyc_addr, ENOT_OWNER);
        assert!(hash.length() == 32, EINVALID_HASH);
        
        let store = borrow_global_mut<CommitmentStore>(@zkyc_addr);
        assert!(!store.commitments.contains(hash), ECOMMITMENT_EXISTS);
        
        let now = timestamp::now_seconds(); // current time in blockchain, not IRL - in real life -
        let commitment = ProofCommitment { hash, issuer_id, validity_window, timestamp: now };
        
        store.commitments.add(hash, commitment);
        store.total_count += 1;
        
        event::emit(CommitmentPublished { hash, issuer_id, validity_window, timestamp: now });
    }

    public entry fun revoke(
        account: &signer,
        hash: vector<u8>
    ) acquires CommitmentStore {
        let signer_addr = signer::address_of(account);
        assert!(signer_addr == @zkyc_addr, ENOT_OWNER);
        
        let store = borrow_global_mut<CommitmentStore>(@zkyc_addr);
        assert!(store.commitments.contains(hash), ECOMMITMENT_NOT_FOUND);
        
        store.commitments.remove(hash);
        event::emit(CommitmentRevoked { hash, revoked_at: timestamp::now_seconds() });
    }

    #[view]
    public fun verify(commitment_hash: vector<u8>): bool acquires CommitmentStore {
        let store = borrow_global<CommitmentStore>(@zkyc_addr);
        
        if (!store.commitments.contains(commitment_hash)) {
            return false
        };
        
        let commitment = store.commitments.borrow(commitment_hash);
        let expiry_time = commitment.timestamp + commitment.validity_window;
        timestamp::now_seconds() <= expiry_time
    }

    #[view]
    public fun get_commitment(commitment_hash: vector<u8>): ProofCommitment acquires CommitmentStore {
        let store = borrow_global<CommitmentStore>(@zkyc_addr);
        assert!(store.commitments.contains(commitment_hash), ECOMMITMENT_NOT_FOUND);
        *store.commitments.borrow(commitment_hash)
    }

    #[view]
    public fun get_total_count(): u64 acquires CommitmentStore {
        borrow_global<CommitmentStore>(@zkyc_addr).total_count
    }

    #[test_only]
    use std::debug::print;

    #[test(owner = @zkyc_addr, framework = @0x1)]
    fun test_publish_and_verify(owner: signer, framework: signer) acquires CommitmentStore {
        timestamp::set_time_has_started_for_testing(&framework);
        init_module(&owner);
        
        let hash = x"a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
        publish_commitment(&owner, hash, 1, 1000000000);
        
        assert!(verify(hash) == true, 1);
        let commitment = get_commitment(hash);
        print(&commitment);
        assert!(commitment.issuer_id == 1, 2);
        assert!(get_total_count() == 1, 3);
    }

    #[test(owner = @zkyc_addr, framework = @0x1)]
    fun test_revoke(owner: signer, framework: signer) acquires CommitmentStore {
        timestamp::set_time_has_started_for_testing(&framework);
        init_module(&owner);
        
        let hash = x"b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
        publish_commitment(&owner, hash, 1, 1000000000);
        assert!(verify(hash) == true, 1);
        
        revoke(&owner, hash);
        assert!(verify(hash) == false, 2);
    }
}
